import {
  IFormObj,
  FORM,
  IFAC1Parsed,
  IFAC1VertexEntry,
  IVTX1Vertex,
} from "./FORM";
import * as THREE from "three";
import { VertexNormalsHelper } from "three/addons/helpers/VertexNormalsHelper.js";
import { Face3, Geometry } from "./three-support/Geometry";
import { invertColor } from "../utils/image";
import { $$hex, $$log } from "../utils/debug";
import { arrayBufferToDataURL } from "../utils/arrays";
import { degreesToRadians } from "../utils/number";

// Converts extracted FORM data into a Three.js scene.
export class FormToThreeJs {
  public bgColor = 0x000000;
  public showTextures = true;
  public showWireframe = false;
  public showVertexNormals = false;
  public useFormCamera = false;

  private __threeResult: THREE.Object3D | undefined;
  private __promises: Promise<any>[] = [];

  createModel(form: IFormObj): Promise<THREE.Object3D> {
    const materials = this._parseMaterials(form);
    this.__threeResult = this._parseForm(form, materials);
    return new Promise((resolve) => {
      Promise.all(this.__promises).then(() => {
        this.__promises = [];
        resolve(this.__threeResult!);
      });
    });
  }

  _parseForm(form: IFormObj, materials: THREE.MeshBasicMaterial[]) {
    const childObjs = this._parseFormObj(form, materials, 0);
    if (childObjs.length !== 1)
      console.warn(
        `Expected 1 return object from _parseForm, got ${childObjs.length}`,
      );
    return childObjs[0];
  }

  _parseFormObj(
    form: IFormObj,
    materials: THREE.MeshBasicMaterial[],
    objIndex: number,
  ) {
    let objs = FORM.getByGlobalIndex(form, "OBJ1", objIndex);
    if (objs === null) {
      if (objIndex === 0) {
        // mp2 62/2 doesn't have 0 obj?
        objs = form.OBJ1[0].parsed.objects[0];
        console.warn("Using first object rather than global index 0 object");
      }

      if (!objs)
        throw new Error(`Attempted to get unavailable OBJ ${objIndex}`);
    }

    if (!Array.isArray(objs)) {
      objs = [objs];
    }

    const newObjs: THREE.Object3D[] = [];

    for (let o = 0; o < objs.length; o++) {
      const obj = objs[o];

      if (obj.objType === 0x3d) {
        // Just references other objects, can transform them.
        const newObj = this._createObject3DFromOBJ1Entry(obj);

        for (let i = 0; i < obj.children.length; i++) {
          const childObjs = this._parseFormObj(
            form,
            materials,
            obj.children[i],
          );
          if (childObjs && childObjs.length) {
            childObjs.forEach((childObj) => {
              newObj.add(childObj);
            });
          }
        }

        newObjs.push(newObj);
      } else if (obj.objType === 0x10) {
        // References a SKL1, which will point back to other objects.
        const newObj = this._createObject3DFromOBJ1Entry(obj);

        const skl1GlobalIndex = obj.skeletonGlobalIndex;
        const sklObj = this._parseFormSkl(form, materials, skl1GlobalIndex);
        newObj.add(sklObj);

        newObjs.push(newObj);
      } else if (obj.objType === 0x3a) {
        const newObj = this._createObject3DFromOBJ1Entry(obj);

        // TODO: Switch to BufferedGeometry instead of legacy Geometry
        // https://github.com/mrdoob/three.js/issues/21538 is fixed
        const geometry = new Geometry();

        for (let f = obj.faceIndex; f < obj.faceIndex + obj.faceCount; f++) {
          const face = form.FAC1[0].parsed.faces[f];
          this._populateGeometryWithFace(form, geometry, face);
        }

        const bufferGeometry = geometry.toBufferGeometry();

        if (this.showTextures) {
          const textureMesh = new THREE.Mesh(bufferGeometry, materials);
          newObj.add(textureMesh);
        }

        if (this.showWireframe) {
          const wireframeMaterial = new THREE.LineBasicMaterial({
            color: invertColor(this.bgColor),
            linewidth: this.showTextures ? 2 : 1,
          });
          const wireframe = new THREE.LineSegments(
            new THREE.EdgesGeometry(bufferGeometry),
            wireframeMaterial,
          );
          newObj.add(wireframe);
        }

        if (this.showVertexNormals) {
          const normalsHelper = new VertexNormalsHelper(
            new THREE.Mesh(bufferGeometry, materials),
            8,
            0x00ff00,
          );
          newObj.add(normalsHelper);
        }

        newObjs.push(newObj);
      }
      // else if (obj.objType === 0x3E) {
      //   if (isDebug()) {
      //     const newObj = new THREE.Object3D();
      //     const geometry = new THREE.Geometry();
      //     geometry.vertices.push(new THREE.Vector3(0, 0, 0));
      //     const dotMaterial = new THREE.PointsMaterial( { color: 0xFF0000, size: 40 } );
      //     const dot = new THREE.Points( geometry, dotMaterial );
      //     newObj.add(dot);
      //     newObjs.push(newObj);
      //   }
      // }
    }

    return newObjs;
  }

  _createObject3DFromOBJ1Entry(obj: any) {
    const newObj = new THREE.Object3D();

    // Name the nodes for animation - see MtnxToThreeJs
    if (obj.hasOwnProperty("globalIndex"))
      newObj.name = this._getObjNameFromId(obj.globalIndex);

    newObj.position.x = obj.posX;
    newObj.position.y = obj.posY;
    newObj.position.z = obj.posZ;

    newObj.rotation.x = degreesToRadians(obj.rotX);
    newObj.rotation.y = degreesToRadians(obj.rotY);
    newObj.rotation.z = degreesToRadians(obj.rotZ);
    newObj.rotation.order = "ZYX";

    newObj.scale.x = obj.scaleX;
    newObj.scale.y = obj.scaleY;
    newObj.scale.z = obj.scaleZ;

    return newObj;
  }

  _getObjNameFromId(id: number) {
    return $$hex(id);
  }

  _parseFormSkl(
    form: IFormObj,
    materials: THREE.MeshBasicMaterial[],
    skl1GlobalIndex: number,
  ) {
    const sklMatch = FORM.getByGlobalIndex(form, "SKL1", skl1GlobalIndex);
    if (sklMatch === null || Array.isArray(sklMatch))
      throw new Error("Unexpected SKL1 search result");

    return this._parseFormSklNode(form, materials, sklMatch.skls, 0);
  }

  _parseFormSklNode(
    form: IFormObj,
    materials: THREE.MeshBasicMaterial[],
    skls: any,
    index: number,
  ) {
    const skl = skls[index];
    const sklObj = this._createObject3DFromOBJ1Entry(skl);

    const objIndex = skl.objGlobalIndex;
    const childObjs = this._parseFormObj(form, materials, objIndex);
    if (childObjs && childObjs.length) {
      childObjs.forEach((childObj) => {
        sklObj.add(childObj);
      });
    }

    if (skl.isParentNode) {
      let currentChildIndex = index + 1;
      while (currentChildIndex) {
        const childSkl = skls[currentChildIndex];
        const childSklObj = this._parseFormSklNode(
          form,
          materials,
          skls,
          currentChildIndex,
        );
        sklObj.add(childSklObj);

        if (childSkl.nextSiblingRelativeIndex) {
          currentChildIndex += childSkl.nextSiblingRelativeIndex;
        } else {
          break;
        }
      }
    }

    return sklObj;
  }

  _populateGeometryWithFace(
    form: IFormObj,
    geometry: Geometry,
    face: IFAC1Parsed,
  ) {
    if (!face.vtxEntries.length) return;

    const scale = form.VTX1[0].parsed.scale;

    const vtxEntries = face.vtxEntries;
    const vtxIndices: number[] = [];
    for (let i = 0; i < 3; i++) {
      const vtxEntry = vtxEntries[i];
      const vtx = form.VTX1[0].parsed.vertices[vtxEntry.vertexIndex];
      vtxIndices.push(geometry.vertices.length);
      geometry.vertices.push(this._makeVertex(vtx, scale));
    }
    if (vtxEntries.length === 4) {
      for (let i = 0; i < 4; i++) {
        if (i === 1) continue; // 0, 2, 3
        const vtxEntry = vtxEntries[i];
        const vtx = form.VTX1[0].parsed.vertices[vtxEntry.vertexIndex];
        vtxIndices.push(geometry.vertices.length);
        geometry.vertices.push(this._makeVertex(vtx, scale));
      }
    }

    if (vtxEntries.length === 3) {
      this._addFace(
        geometry,
        form,
        face,
        [vtxIndices[0], vtxIndices[1], vtxIndices[2]],
        [vtxEntries[0], vtxEntries[1], vtxEntries[2]],
      );
    } else if (vtxEntries.length === 4) {
      this._addFace(
        geometry,
        form,
        face,
        [vtxIndices[0], vtxIndices[1], vtxIndices[2]],
        [vtxEntries[0], vtxEntries[1], vtxEntries[2]],
      );

      this._addFace(
        geometry,
        form,
        face,
        [vtxIndices[3], vtxIndices[4], vtxIndices[5]],
        [vtxEntries[0], vtxEntries[2], vtxEntries[3]],
      );
    }
  }

  _addFace(
    geometry: Geometry,
    form: IFormObj,
    face: IFAC1Parsed,
    indices: number[],
    vtxEntries: IFAC1VertexEntry[],
  ) {
    const tri = new Face3(indices[0], indices[1], indices[2]);
    tri.vertexNormals = this._makeVertexNormals(
      form,
      vtxEntries[0].vertexIndex,
      vtxEntries[1].vertexIndex,
      vtxEntries[2].vertexIndex,
    );
    tri.materialIndex = this._getMaterialIndex(face)!;
    tri.color = new THREE.Color(this._getColorBytes(form, face));
    tri.vertexColors = this._makeVertexColors(
      form,
      face,
      vtxEntries[0],
      vtxEntries[1],
      vtxEntries[2],
    );

    geometry.faceVertexUvs[0].push(
      this._makeVertexUVs(vtxEntries[0], vtxEntries[1], vtxEntries[2]),
    );
    geometry.faces.push(tri);
  }

  _parseMaterials(form: IFormObj): THREE.MeshBasicMaterial[] {
    const materials = [
      new THREE.MeshBasicMaterial({ vertexColors: true }),
      new THREE.MeshBasicMaterial({ vertexColors: true }),
    ];

    if (form.BMP1) {
      if (form.ATR1 && form.ATR1[0]) {
        const atrs = form.ATR1[0].parsed.atrs;
        for (let i = 0; i < atrs.length; i++) {
          const atr = atrs[i];
          const bmp = FORM.getByGlobalIndex(form, "BMP1", atr.bmpGlobalIndex);
          if (bmp === null || Array.isArray(bmp)) {
            console.warn("Unexpected bitmap result from global index lookup");
            continue;
          }

          const textureMaterial = this._createTextureMaterial(atr, bmp);
          materials.push(textureMaterial);
        }
      } else {
        console.warn("BMPs, but no ATRs");
      }
    }

    return materials;
  }

  _createTextureMaterial(atr: any, bmp: any) {
    const dataUri = arrayBufferToDataURL(bmp.src, bmp.width, bmp.height);
    $$log("Texture", dataUri);
    const loader = new THREE.TextureLoader();
    loader.crossOrigin = "";
    let texture: THREE.Texture;
    const texturePromise = new Promise((resolve) => {
      texture = loader.load(dataUri, resolve);
      texture.flipY = false;
      texture.wrapS = this._getWrappingBehavior(atr.xBehavior);
      texture.wrapT = this._getWrappingBehavior(atr.yBehavior);
      texture.colorSpace = THREE.SRGBColorSpace;
    });
    this.__promises.push(texturePromise);

    return new THREE.MeshBasicMaterial({
      alphaTest: 0.5,
      map: texture!,
      //transparent: true,
      vertexColors: true,
    });
  }

  _getWrappingBehavior(behavior: any): THREE.Wrapping {
    switch (behavior) {
      case 0x2c:
        return THREE.MirroredRepeatWrapping;
      case 0x2d:
        return THREE.RepeatWrapping;
      case 0x2e:
        return THREE.ClampToEdgeWrapping; // default
      default:
        console.warn(`Unknown behavior ${$$hex(behavior)}`);
        return THREE.ClampToEdgeWrapping; // default
    }
  }

  _makeVertex(vtx: IVTX1Vertex, scale: number) {
    return new THREE.Vector3(vtx.x * scale, vtx.y * scale, vtx.z * scale);
  }

  _makeVertexNormals(
    form: IFormObj,
    vtxIndex1: number,
    vtxIndex2: number,
    vtxIndex3: number,
  ) {
    return [
      this._makeVertexNormal(form, vtxIndex1),
      this._makeVertexNormal(form, vtxIndex2),
      this._makeVertexNormal(form, vtxIndex3),
    ];
  }

  _makeVertexNormal(form: IFormObj, vtxIndex: number) {
    const vtx = form.VTX1[0].parsed.vertices[vtxIndex];
    const normalVector = new THREE.Vector3(
      vtx.normalX / (127 + (vtx.normalX < 0 ? 1 : 0)),
      vtx.normalY / (127 + (vtx.normalY < 0 ? 1 : 0)),
      vtx.normalZ / (127 + (vtx.normalZ < 0 ? 1 : 0)),
    );
    normalVector.normalize();
    return normalVector;
  }

  _makeVertexUVs(
    vtxEntry1: IFAC1VertexEntry,
    vtxEntry2: IFAC1VertexEntry,
    vtxEntry3: IFAC1VertexEntry,
  ) {
    return [
      this._makeVertexUV(vtxEntry1),
      this._makeVertexUV(vtxEntry2),
      this._makeVertexUV(vtxEntry3),
    ];
  }

  _makeVertexUV(vtxEntry: IFAC1VertexEntry) {
    return new THREE.Vector2(vtxEntry.u, vtxEntry.v);
  }

  _getMaterialIndex(face: IFAC1Parsed) {
    if (face.atrIndex >= 0 || face.mystery3 === 0x36) {
      // Face colors, or maybe bitmap
      // If it is 0xFFFF (-1) -> THREE.FaceColors material
      // If greater, it'll be a bitmap material
      return face.atrIndex + 2;
    } else if (face.mystery3 === 0x37) {
      // Vertex colors?
      return 0; // Vertex colors
    }
  }

  _getColorBytes(form: IFormObj, face: IFAC1Parsed) {
    if (face.mystery3 === 0x36) {
      const materialIndex = face.materialIndex;
      return this._getColorFromMaterial(form, materialIndex);
    } else if (face.mystery3 === 0x37) {
      // Vertex colors?
      return 0xfffc00; // Puke green, shouldn't see this
    }

    console.warn("Could not determine color for face");
  }

  _getColorFromMaterial(form: IFormObj, materialIndex: number) {
    let colorIndex;
    if (form.MAT1 && form.MAT1[0] && form.MAT1[0].parsed) {
      colorIndex = form.MAT1[0].parsed.materials[materialIndex].colorIndex;
      if (form.COL1 && form.COL1[0] && form.COL1[0].parsed) {
        if (form.COL1[0].parsed.hasOwnProperty(colorIndex))
          return form.COL1[0].parsed[colorIndex] >>> 8;
      }
    }

    console.warn(
      `Could not find color ${colorIndex} specified by material ${materialIndex}`,
    );
    return 0xfffc00; // Puke green
  }

  _makeVertexColors(
    form: IFormObj,
    face: IFAC1Parsed,
    vtxEntry1: IFAC1VertexEntry,
    vtxEntry2: IFAC1VertexEntry,
    vtxEntry3: IFAC1VertexEntry,
  ) {
    if (face.mystery3 !== 0x37) return [];

    return [
      this._makeVertexColor(form, vtxEntry1)!,
      this._makeVertexColor(form, vtxEntry2)!,
      this._makeVertexColor(form, vtxEntry3)!,
    ];
  }

  _makeVertexColor(form: IFormObj, vtxEntry: IFAC1VertexEntry) {
    if (vtxEntry.materialIndex < 0) return null;
    return new THREE.Color(
      this._getColorFromMaterial(form, vtxEntry.materialIndex),
    );
  }

  createCamera(form: IFormObj, width: number, height: number) {
    const camera = new THREE.PerspectiveCamera(75, width / height, 1, 999999);
    if (this.useFormCamera) {
      const cameraObjs = FORM.getObjectsByType(form, 0x61);
      if (cameraObjs.length === 3) {
        const cameraEyeObj = cameraObjs[0];
        const cameraInterestObj = cameraObjs[1];
        camera.position.set(
          cameraEyeObj.posX,
          cameraEyeObj.posY,
          cameraEyeObj.posZ,
        );
        camera.lookAt(
          new THREE.Vector3(
            cameraInterestObj.posX,
            cameraInterestObj.posY,
            cameraInterestObj.posZ,
          ),
        );
        return camera;
      } else {
        console.warn(`Unexpected camera object count: ${cameraObjs.length}`);
      }
    }

    camera.position.z = 500;
    return camera;
  }
}
