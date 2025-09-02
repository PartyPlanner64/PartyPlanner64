import {
  Box3,
  BufferAttribute,
  BufferGeometry,
  Color,
  EventDispatcher,
  Float32BufferAttribute,
  Matrix3,
  Matrix4,
  MathUtils,
  Object3D,
  Sphere,
  Vector2,
  Vector3,
  Vector4,
  Mesh,
  InterleavedBufferAttribute,
  Triangle,
  GeometryGroup,
} from "three";
import { normalize } from "three/src/math/MathUtils.js";

const _m1 = /* @__PURE__ */ new Matrix4();
const _obj = /* @__PURE__ */ new Object3D();
const _offset = /* @__PURE__ */ new Vector3();

export interface MorphTarget {
  name: string;
  vertices?: Vector3[];
  normals?: Vector3[];
}

export interface MorphNormals {
  name?: string;
  faceNormals?: Vector3[];
  vertexNormals?: Triangle[];
}

interface NameDataPair {
  name?: string;
  data: Vector3[];
}

export class Geometry extends EventDispatcher<{ dispose: {} }> {
  public uuid: string;

  public readonly isGeometry: true;

  /**
   * Name for this geometry. Default is an empty string.
   * @default ''
   */
  public name: string;

  /**
   * @default 'Geometry'
   */
  public type: string;

  /**
   * The array of vertices hold every position of points of the model.
   * To signal an update in this array, Geometry.verticesNeedUpdate needs to be set to true.
   * @default []
   */
  public vertices: Vector3[];

  /**
   * Array of vertex colors, matching number and order of vertices.
   * Used in ParticleSystem, Line and Ribbon.
   * Meshes use per-face-use-of-vertex colors embedded directly in faces.
   * To signal an update in this array, Geometry.colorsNeedUpdate needs to be set to true.
   * @default []
   */
  public colors: Color[];

  /**
   * Array of triangles or/and quads.
   * The array of faces describe how each vertex in the model is connected with each other.
   * To signal an update in this array, Geometry.elementsNeedUpdate needs to be set to true.
   * @default []
   */
  public faces: Face3[];

  /**
   * Array of face UV layers.
   * Each UV layer is an array of UV matching order and number of vertices in faces.
   * To signal an update in this array, Geometry.uvsNeedUpdate needs to be set to true.
   * @default [[]]
   */
  public faceVertexUvs: Vector2[][][];

  /**
   * Array of morph targets. Each morph target is a Javascript object.
   *
   * Morph vertices match number and order of primary vertices.
   * @default []
   */
  public morphTargets: MorphTarget[];

  /**
   * Array of morph normals. Morph normals have similar structure as morph targets, each normal set is a Javascript object.
   * @default []
   */
  public morphNormals: MorphNormals[];

  /**
   * Array of skinning weights, matching number and order of vertices.
   * @default []
   */
  public skinWeights: Vector4[];

  /**
   * Array of skinning indices, matching number and order of vertices.
   * @default []
   */
  public skinIndices: Vector4[];

  /**
   * @default []
   */
  public lineDistances: number[];

  /**
   * Bounding box.
   * @default null
   */
  public boundingBox: Box3 | null;

  /**
   * Bounding sphere.
   * @default null
   */
  public boundingSphere: Sphere | null;

  /**
   * Set to true if the vertices array has been updated.
   * @default false
   */
  public verticesNeedUpdate: boolean;

  /**
   * Set to true if the faces array has been updated.
   * @default false
   */
  public elementsNeedUpdate: boolean;

  /**
   * Set to true if the uvs array has been updated.
   * @default false
   */
  public uvsNeedUpdate: boolean;

  /**
   * Set to true if the normals array has been updated.
   * @default false
   */
  public normalsNeedUpdate: boolean;

  /**
   * Set to true if the colors array has been updated.
   * @default false
   */
  public colorsNeedUpdate: boolean;

  /**
   * Set to true if the linedistances array has been updated.
   * @default false
   */
  public lineDistancesNeedUpdate: boolean;

  /**
   *
   * @default false
   */
  public groupsNeedUpdate: boolean;

  private parameters?: any;

  static createBufferGeometryFromObject(object: any): BufferGeometry {
    let buffergeometry = new BufferGeometry();

    const geometry = object.geometry;

    if (object.isPoints || object.isLine) {
      const positions = new Float32BufferAttribute(
        geometry.vertices.length * 3,
        3,
      );
      const colors = new Float32BufferAttribute(geometry.colors.length * 3, 3);

      buffergeometry.setAttribute(
        "position",
        copyVector3sArray(positions, geometry.vertices),
      );
      buffergeometry.setAttribute(
        "color",
        copyColorsArray(colors, geometry.colors),
      );

      if (
        geometry.lineDistances &&
        geometry.lineDistances.length === geometry.vertices.length
      ) {
        const lineDistances = new Float32BufferAttribute(
          geometry.lineDistances.length,
          1,
        );

        buffergeometry.setAttribute(
          "lineDistance",
          lineDistances.copyArray(geometry.lineDistances),
        );
      }

      if (geometry.boundingSphere !== null) {
        buffergeometry.boundingSphere = geometry.boundingSphere.clone();
      }

      if (geometry.boundingBox !== null) {
        buffergeometry.boundingBox = geometry.boundingBox.clone();
      }
    } else if (object.isMesh) {
      buffergeometry = geometry.toBufferGeometry();
    }

    return buffergeometry;
  }

  public constructor() {
    super();
    this.isGeometry = true;
    this.uuid = MathUtils.generateUUID();

    this.name = "";
    this.type = "Geometry";

    this.vertices = [];
    this.colors = [];
    this.faces = [];
    this.faceVertexUvs = [[]];

    this.morphTargets = [];
    this.morphNormals = [];

    this.skinWeights = [];
    this.skinIndices = [];

    this.lineDistances = [];

    this.boundingBox = null;
    this.boundingSphere = null;

    // update flags

    this.elementsNeedUpdate = false;
    this.verticesNeedUpdate = false;
    this.uvsNeedUpdate = false;
    this.normalsNeedUpdate = false;
    this.colorsNeedUpdate = false;
    this.lineDistancesNeedUpdate = false;
    this.groupsNeedUpdate = false;
  }

  public applyMatrix4(matrix: Matrix4): Geometry {
    const normalMatrix = new Matrix3().getNormalMatrix(matrix);

    for (let i = 0, il = this.vertices.length; i < il; i++) {
      const vertex = this.vertices[i];
      vertex.applyMatrix4(matrix);
    }

    for (let i = 0, il = this.faces.length; i < il; i++) {
      const face = this.faces[i];
      face.normal.applyMatrix3(normalMatrix).normalize();

      for (let j = 0, jl = face.vertexNormals.length; j < jl; j++) {
        face.vertexNormals[j].applyMatrix3(normalMatrix).normalize();
      }
    }

    if (this.boundingBox !== null) {
      this.computeBoundingBox();
    }

    if (this.boundingSphere !== null) {
      this.computeBoundingSphere();
    }

    this.verticesNeedUpdate = true;
    this.normalsNeedUpdate = true;

    return this;
  }

  public rotateX(angle: number): Geometry {
    // rotate geometry around world x-axis

    _m1.makeRotationX(angle);

    this.applyMatrix4(_m1);

    return this;
  }

  public rotateY(angle: number): Geometry {
    // rotate geometry around world y-axis

    _m1.makeRotationY(angle);

    this.applyMatrix4(_m1);

    return this;
  }

  public rotateZ(angle: number): Geometry {
    // rotate geometry around world z-axis

    _m1.makeRotationZ(angle);

    this.applyMatrix4(_m1);

    return this;
  }

  public translate(x: number, y: number, z: number): Geometry {
    // translate geometry

    _m1.makeTranslation(x, y, z);

    this.applyMatrix4(_m1);

    return this;
  }

  public scale(x: number, y: number, z: number): Geometry {
    // scale geometry

    _m1.makeScale(x, y, z);

    this.applyMatrix4(_m1);

    return this;
  }

  public lookAt(vector: Vector3): this {
    _obj.lookAt(vector);

    _obj.updateMatrix();

    this.applyMatrix4(_obj.matrix);

    return this;
  }

  public fromBufferGeometry(geometry: BufferGeometry): Geometry {
    const scope = this;

    const index = geometry.index !== null ? geometry.index : undefined;
    const attributes = geometry.attributes;

    if (attributes.position === undefined) {
      console.error(
        "THREE.Geometry.fromBufferGeometry(): Position attribute required for conversion.",
      );
      return this;
    }

    const position = attributes.position;
    const normal = attributes.normal;
    const color = attributes.color;
    const uv = attributes.uv;
    const uv2 = attributes.uv2;

    if (uv2 !== undefined) this.faceVertexUvs[1] = [];

    for (let i = 0; i < position.count; i++) {
      scope.vertices.push(new Vector3().fromBufferAttribute(position, i));

      if (color !== undefined) {
        scope.colors.push(new Color().fromBufferAttribute(color, i));
      }
    }

    function addFace(a: number, b: number, c: number, materialIndex?: number) {
      const vertexColors =
        color === undefined
          ? []
          : [
              scope.colors[a].clone(),
              scope.colors[b].clone(),
              scope.colors[c].clone(),
            ];

      const vertexNormals =
        normal === undefined
          ? []
          : [
              new Vector3().fromBufferAttribute(normal, a),
              new Vector3().fromBufferAttribute(normal, b),
              new Vector3().fromBufferAttribute(normal, c),
            ];

      const face = new Face3(
        a,
        b,
        c,
        vertexNormals,
        vertexColors,
        materialIndex,
      );

      scope.faces.push(face);

      if (uv !== undefined) {
        if (uv instanceof InterleavedBufferAttribute) {
          throw new Error(
            "Vector2().fromBufferAttribute not implemented for InterleavedBufferAttribute.",
          );
        }
        scope.faceVertexUvs[0].push([
          new Vector2().fromBufferAttribute(uv, a),
          new Vector2().fromBufferAttribute(uv, b),
          new Vector2().fromBufferAttribute(uv, c),
        ]);
      }

      if (uv2 !== undefined) {
        if (uv2 instanceof InterleavedBufferAttribute) {
          throw new Error(
            "Vector2().fromBufferAttribute not implemented for InterleavedBufferAttribute.",
          );
        }
        scope.faceVertexUvs[1].push([
          new Vector2().fromBufferAttribute(uv2, a),
          new Vector2().fromBufferAttribute(uv2, b),
          new Vector2().fromBufferAttribute(uv2, c),
        ]);
      }
    }

    const groups = geometry.groups;

    if (groups.length > 0) {
      for (let i = 0; i < groups.length; i++) {
        const group = groups[i];

        const start = group.start;
        const count = group.count;

        for (let j = start, jl = start + count; j < jl; j += 3) {
          if (index !== undefined) {
            addFace(
              index.getX(j),
              index.getX(j + 1),
              index.getX(j + 2),
              group.materialIndex,
            );
          } else {
            addFace(j, j + 1, j + 2, group.materialIndex);
          }
        }
      }
    } else {
      if (index !== undefined) {
        for (let i = 0; i < index.count; i += 3) {
          addFace(index.getX(i), index.getX(i + 1), index.getX(i + 2));
        }
      } else {
        for (let i = 0; i < position.count; i += 3) {
          addFace(i, i + 1, i + 2);
        }
      }
    }

    this.computeFaceNormals();

    if (geometry.boundingBox !== null) {
      this.boundingBox = geometry.boundingBox.clone();
    }

    if (geometry.boundingSphere !== null) {
      this.boundingSphere = geometry.boundingSphere.clone();
    }

    return this;
  }

  public center(): this {
    this.computeBoundingBox();

    this.boundingBox!.getCenter(_offset).negate();

    this.translate(_offset.x, _offset.y, _offset.z);

    return this;
  }

  public normalize(): this {
    this.computeBoundingSphere();

    const center = this.boundingSphere!.center;
    const radius = this.boundingSphere!.radius;

    const s = radius === 0 ? 1 : 1.0 / radius;

    const matrix = new Matrix4();
    matrix.set(
      s,
      0,
      0,
      -s * center.x,
      0,
      s,
      0,
      -s * center.y,
      0,
      0,
      s,
      -s * center.z,
      0,
      0,
      0,
      1,
    );

    this.applyMatrix4(matrix);

    return this;
  }

  public computeFaceNormals(): void {
    const cb = new Vector3(),
      ab = new Vector3();

    for (let f = 0, fl = this.faces.length; f < fl; f++) {
      const face = this.faces[f];

      const vA = this.vertices[face.a];
      const vB = this.vertices[face.b];
      const vC = this.vertices[face.c];

      cb.subVectors(vC, vB);
      ab.subVectors(vA, vB);
      cb.cross(ab);

      cb.normalize();

      face.normal.copy(cb);
    }
  }

  public computeVertexNormals(areaWeighted: boolean = true): void {
    const vertices = new Array(this.vertices.length);

    for (let v = 0, vl = this.vertices.length; v < vl; v++) {
      vertices[v] = new Vector3();
    }

    if (areaWeighted) {
      // vertex normals weighted by triangle areas
      // http://www.iquilezles.org/www/articles/normals/normals.htm

      const cb = new Vector3(),
        ab = new Vector3();

      for (let f = 0, fl = this.faces.length; f < fl; f++) {
        const face = this.faces[f];

        const vA = this.vertices[face.a];
        const vB = this.vertices[face.b];
        const vC = this.vertices[face.c];

        cb.subVectors(vC, vB);
        ab.subVectors(vA, vB);
        cb.cross(ab);

        vertices[face.a].add(cb);
        vertices[face.b].add(cb);
        vertices[face.c].add(cb);
      }
    } else {
      this.computeFaceNormals();

      for (let f = 0, fl = this.faces.length; f < fl; f++) {
        const face = this.faces[f];

        vertices[face.a].add(face.normal);
        vertices[face.b].add(face.normal);
        vertices[face.c].add(face.normal);
      }
    }

    for (let v = 0, vl = this.vertices.length; v < vl; v++) {
      vertices[v].normalize();
    }

    for (let f = 0, fl = this.faces.length; f < fl; f++) {
      const face = this.faces[f];

      const vertexNormals = face.vertexNormals;

      if (vertexNormals.length === 3) {
        vertexNormals[0].copy(vertices[face.a]);
        vertexNormals[1].copy(vertices[face.b]);
        vertexNormals[2].copy(vertices[face.c]);
      } else {
        vertexNormals[0] = vertices[face.a].clone();
        vertexNormals[1] = vertices[face.b].clone();
        vertexNormals[2] = vertices[face.c].clone();
      }
    }

    if (this.faces.length > 0) {
      this.normalsNeedUpdate = true;
    }
  }

  public computeFlatVertexNormals(): void {
    this.computeFaceNormals();

    for (let f = 0, fl = this.faces.length; f < fl; f++) {
      const face = this.faces[f];

      const vertexNormals = face.vertexNormals;

      if (vertexNormals.length === 3) {
        vertexNormals[0].copy(face.normal);
        vertexNormals[1].copy(face.normal);
        vertexNormals[2].copy(face.normal);
      } else {
        vertexNormals[0] = face.normal.clone();
        vertexNormals[1] = face.normal.clone();
        vertexNormals[2] = face.normal.clone();
      }
    }

    if (this.faces.length > 0) {
      this.normalsNeedUpdate = true;
    }
  }

  public computeMorphNormals(): void {
    // save original normals
    // - create temp variables on first access
    //   otherwise just copy (for faster repeated calls)

    for (let f = 0, fl = this.faces.length; f < fl; f++) {
      const face = this.faces[f];

      if (!face.__originalFaceNormal) {
        face.__originalFaceNormal = face.normal.clone();
      } else {
        face.__originalFaceNormal.copy(face.normal);
      }

      if (!face.__originalVertexNormals) face.__originalVertexNormals = [];

      for (let i = 0, il = face.vertexNormals.length; i < il; i++) {
        if (!face.__originalVertexNormals[i]) {
          face.__originalVertexNormals[i] = face.vertexNormals[i].clone();
        } else {
          face.__originalVertexNormals[i].copy(face.vertexNormals[i]);
        }
      }
    }

    // use temp geometry to compute face and vertex normals for each morph

    const tmpGeo = new Geometry();
    tmpGeo.faces = this.faces;

    for (let i = 0, il = this.morphTargets.length; i < il; i++) {
      // create on first access

      if (!this.morphNormals[i]) {
        this.morphNormals[i] = {
          faceNormals: [],
          vertexNormals: [],
        };

        const dstNormalsFace = this.morphNormals[i].faceNormals!;
        const dstNormalsVertex = this.morphNormals[i].vertexNormals!;

        for (let f = 0, fl = this.faces.length; f < fl; f++) {
          const faceNormal = new Vector3();
          const vertexNormals = new Triangle();

          dstNormalsFace.push(faceNormal);
          dstNormalsVertex.push(vertexNormals);
        }
      }

      const morphNormals = this.morphNormals[i];

      // set vertices to morph target

      tmpGeo.vertices = this.morphTargets[i].vertices!;

      // compute morph normals

      tmpGeo.computeFaceNormals();
      tmpGeo.computeVertexNormals();

      // store morph normals

      for (let f = 0, fl = this.faces.length; f < fl; f++) {
        const face = this.faces[f];

        const faceNormal = morphNormals.faceNormals![f];
        const vertexNormals = morphNormals.vertexNormals![f];

        faceNormal.copy(face.normal);

        vertexNormals.a.copy(face.vertexNormals[0]);
        vertexNormals.b.copy(face.vertexNormals[1]);
        vertexNormals.c.copy(face.vertexNormals[2]);
      }
    }

    // restore original normals

    for (let f = 0, fl = this.faces.length; f < fl; f++) {
      const face = this.faces[f];

      face.normal = face.__originalFaceNormal!;
      face.vertexNormals = face.__originalVertexNormals!;
    }
  }

  public computeBoundingBox(): void {
    if (this.boundingBox === null) {
      this.boundingBox = new Box3();
    }

    this.boundingBox.setFromPoints(this.vertices);
  }

  public computeBoundingSphere(): void {
    if (this.boundingSphere === null) {
      this.boundingSphere = new Sphere();
    }

    this.boundingSphere.setFromPoints(this.vertices);
  }

  public merge(
    geometry: Geometry,
    matrix?: Matrix4,
    materialIndexOffset: number = 0,
  ): void {
    if (!(geometry && geometry.isGeometry)) {
      console.error(
        "THREE.Geometry.merge(): geometry not an instance of THREE.Geometry.",
        geometry,
      );
      return;
    }

    let normalMatrix;
    const vertexOffset = this.vertices.length,
      vertices1 = this.vertices,
      vertices2 = geometry.vertices,
      faces1 = this.faces,
      faces2 = geometry.faces,
      colors1 = this.colors,
      colors2 = geometry.colors;

    if (matrix !== undefined) {
      normalMatrix = new Matrix3().getNormalMatrix(matrix);
    }

    // vertices

    for (let i = 0, il = vertices2.length; i < il; i++) {
      const vertex = vertices2[i];

      const vertexCopy = vertex.clone();

      if (matrix !== undefined) vertexCopy.applyMatrix4(matrix);

      vertices1.push(vertexCopy);
    }

    // colors

    for (let i = 0, il = colors2.length; i < il; i++) {
      colors1.push(colors2[i].clone());
    }

    // faces

    for (let i = 0, il = faces2.length; i < il; i++) {
      const face = faces2[i];
      let normal, color;
      const faceVertexNormals = face.vertexNormals,
        faceVertexColors = face.vertexColors;

      const faceCopy = new Face3(
        face.a + vertexOffset,
        face.b + vertexOffset,
        face.c + vertexOffset,
      );
      faceCopy.normal.copy(face.normal);

      if (normalMatrix !== undefined) {
        faceCopy.normal.applyMatrix3(normalMatrix).normalize();
      }

      for (let j = 0, jl = faceVertexNormals.length; j < jl; j++) {
        normal = faceVertexNormals[j].clone();

        if (normalMatrix !== undefined) {
          normal.applyMatrix3(normalMatrix).normalize();
        }

        faceCopy.vertexNormals.push(normal);
      }

      faceCopy.color.copy(face.color);

      for (let j = 0, jl = faceVertexColors.length; j < jl; j++) {
        color = faceVertexColors[j];
        faceCopy.vertexColors.push(color.clone());
      }

      faceCopy.materialIndex = face.materialIndex + materialIndexOffset;

      faces1.push(faceCopy);
    }

    // uvs

    for (let i = 0, il = geometry.faceVertexUvs.length; i < il; i++) {
      const faceVertexUvs2 = geometry.faceVertexUvs[i];

      if (this.faceVertexUvs[i] === undefined) this.faceVertexUvs[i] = [];

      for (let j = 0, jl = faceVertexUvs2.length; j < jl; j++) {
        const uvs2 = faceVertexUvs2[j],
          uvsCopy = [];

        for (let k = 0, kl = uvs2.length; k < kl; k++) {
          uvsCopy.push(uvs2[k].clone());
        }

        this.faceVertexUvs[i].push(uvsCopy);
      }
    }
  }

  public mergeMesh(): never {
    throw new Error("THREE.Geometry.mergeMesh(): not implemented.");
  }

  /*
   * Checks for duplicate vertices with hashmap.
   * Duplicated vertices are removed
   * and faces' vertices are updated.
   */

  public mergeVertices(precisionPoints: number = 4): number {
    const verticesMap: Record<string, number> = {}; // Hashmap for looking up vertices by position coordinates (and making sure they are unique)
    const unique: Vector3[] = [];
    const changes: number[] = [];

    const precision = Math.pow(10, precisionPoints);

    for (let i = 0, il = this.vertices.length; i < il; i++) {
      const v = this.vertices[i];
      const key = `${Math.round(v.x * precision)}_${Math.round(v.y * precision)}_${Math.round(v.z * precision)}`;

      if (verticesMap[key] === undefined) {
        verticesMap[key] = i;
        unique.push(this.vertices[i]);
        changes[i] = unique.length - 1;
      } else {
        //console.log('Duplicate vertex found. ', i, ' could be using ', verticesMap[key]);
        changes[i] = changes[verticesMap[key]];
      }
    }

    // if faces are completely degenerate after merging vertices, we
    // have to remove them from the geometry.
    const faceIndicesToRemove = [];

    for (let i = 0, il = this.faces.length; i < il; i++) {
      const face = this.faces[i];

      face.a = changes[face.a];
      face.b = changes[face.b];
      face.c = changes[face.c];

      const indices = [face.a, face.b, face.c];

      // if any duplicate vertices are found in a Face3
      // we have to remove the face as nothing can be saved
      for (let n = 0; n < 3; n++) {
        if (indices[n] === indices[(n + 1) % 3]) {
          faceIndicesToRemove.push(i);
          break;
        }
      }
    }

    for (let i = faceIndicesToRemove.length - 1; i >= 0; i--) {
      const idx = faceIndicesToRemove[i];

      this.faces.splice(idx, 1);

      for (let j = 0, jl = this.faceVertexUvs.length; j < jl; j++) {
        this.faceVertexUvs[j].splice(idx, 1);
      }
    }

    // Use unique set of vertices

    const diff = this.vertices.length - unique.length;
    this.vertices = unique;
    return diff;
  }

  public setFromPoints(points: Vector2[] | Vector3[]): this {
    this.vertices = [];

    for (let i = 0, l = points.length; i < l; i++) {
      const point = points[i];
      this.vertices.push(
        new Vector3(point.x, point.y, (point as Vector3).z || 0),
      );
    }

    return this;
  }

  public sortFacesByMaterialIndex(): void {
    const faces = this.faces;
    const length = faces.length;

    // tag faces

    for (let i = 0; i < length; i++) {
      faces[i]._id = i;
    }

    // sort faces

    function materialIndexSort(a: Face3, b: Face3): number {
      return a.materialIndex - b.materialIndex;
    }

    faces.sort(materialIndexSort);

    // sort uvs

    const uvs1 = this.faceVertexUvs[0];
    const uvs2 = this.faceVertexUvs[1];

    let newUvs1: Vector2[][] | undefined;
    let newUvs2: Vector2[][] | undefined;

    if (uvs1 && uvs1.length === length) newUvs1 = [];
    if (uvs2 && uvs2.length === length) newUvs2 = [];

    for (let i = 0; i < length; i++) {
      const id = faces[i]._id!;

      if (newUvs1) newUvs1.push(uvs1[id]);
      if (newUvs2) newUvs2.push(uvs2[id]);
    }

    if (newUvs1) this.faceVertexUvs[0] = newUvs1;
    if (newUvs2) this.faceVertexUvs[1] = newUvs2;
  }

  public toJSON(): any {
    const data: any = {
      metadata: {
        version: 4.5,
        type: "Geometry",
        generator: "Geometry.toJSON",
      },
    };

    // standard Geometry serialization

    data.uuid = this.uuid;
    data.type = this.type;
    if (this.name !== "") data.name = this.name;

    if (this.parameters !== undefined) {
      const parameters = this.parameters;

      for (let key in parameters) {
        if (parameters[key] !== undefined) data[key] = parameters[key];
      }

      return data;
    }

    const vertices = [];

    for (let i = 0; i < this.vertices.length; i++) {
      const vertex = this.vertices[i];
      vertices.push(vertex.x, vertex.y, vertex.z);
    }

    const faces = [];
    const normals: number[] = [];
    const normalsHash: Record<string, number> = {};
    const colors: number[] = [];
    const colorsHash: Record<string, number> = {};
    const uvs: number[] = [];
    const uvsHash: Record<string, number> = {};

    for (let i = 0; i < this.faces.length; i++) {
      const face = this.faces[i];

      const hasMaterial = true;
      const hasFaceUv = false; // deprecated
      const hasFaceVertexUv = this.faceVertexUvs[0][i] !== undefined;
      const hasFaceNormal = face.normal.length() > 0;
      const hasFaceVertexNormal = face.vertexNormals.length > 0;
      const hasFaceColor =
        face.color.r !== 1 || face.color.g !== 1 || face.color.b !== 1;
      const hasFaceVertexColor = face.vertexColors.length > 0;

      let faceType = 0;

      faceType = setBit(faceType, 0, false); // isQuad
      faceType = setBit(faceType, 1, hasMaterial);
      faceType = setBit(faceType, 2, hasFaceUv);
      faceType = setBit(faceType, 3, hasFaceVertexUv);
      faceType = setBit(faceType, 4, hasFaceNormal);
      faceType = setBit(faceType, 5, hasFaceVertexNormal);
      faceType = setBit(faceType, 6, hasFaceColor);
      faceType = setBit(faceType, 7, hasFaceVertexColor);

      faces.push(faceType);
      faces.push(face.a, face.b, face.c);
      faces.push(face.materialIndex);

      if (hasFaceVertexUv) {
        const faceVertexUvs = this.faceVertexUvs[0][i];

        faces.push(
          getUvIndex(faceVertexUvs[0]),
          getUvIndex(faceVertexUvs[1]),
          getUvIndex(faceVertexUvs[2]),
        );
      }

      if (hasFaceNormal) {
        faces.push(getNormalIndex(face.normal));
      }

      if (hasFaceVertexNormal) {
        const vertexNormals = face.vertexNormals;

        faces.push(
          getNormalIndex(vertexNormals[0]),
          getNormalIndex(vertexNormals[1]),
          getNormalIndex(vertexNormals[2]),
        );
      }

      if (hasFaceColor) {
        faces.push(getColorIndex(face.color));
      }

      if (hasFaceVertexColor) {
        const vertexColors = face.vertexColors;

        faces.push(
          getColorIndex(vertexColors[0]),
          getColorIndex(vertexColors[1]),
          getColorIndex(vertexColors[2]),
        );
      }
    }

    function setBit(value: number, position: number, enabled: boolean): number {
      return enabled ? value | (1 << position) : value & ~(1 << position);
    }

    function getNormalIndex(normal: Vector3): number {
      const hash =
        normal.x.toString() + normal.y.toString() + normal.z.toString();

      if (normalsHash[hash] !== undefined) {
        return normalsHash[hash];
      }

      normalsHash[hash] = normals.length / 3;
      normals.push(normal.x, normal.y, normal.z);

      return normalsHash[hash];
    }

    function getColorIndex(color: Color): number {
      const hash = color.r.toString() + color.g.toString() + color.b.toString();

      if (colorsHash[hash] !== undefined) {
        return colorsHash[hash];
      }

      colorsHash[hash] = colors.length;
      colors.push(color.getHex());

      return colorsHash[hash];
    }

    function getUvIndex(uv: Vector2): number {
      const hash = uv.x.toString() + uv.y.toString();

      if (uvsHash[hash] !== undefined) {
        return uvsHash[hash];
      }

      uvsHash[hash] = uvs.length / 2;
      uvs.push(uv.x, uv.y);

      return uvsHash[hash];
    }

    data.data = {};

    data.data.vertices = vertices;
    data.data.normals = normals;
    if (colors.length > 0) data.data.colors = colors;
    if (uvs.length > 0) data.data.uvs = [uvs]; // temporal backward compatibility
    data.data.faces = faces;

    return data;
  }

  public clone(): Geometry {
    /*
    // Handle primitives

    const parameters = this.parameters;

    if ( parameters !== undefined ) {

    const values = [];

    for ( const key in parameters ) {

    values.push( parameters[ key ] );

    }

    const geometry = Object.create( this.constructor.prototype );
    this.constructor.apply( geometry, values );
    return geometry;

    }

    return new this.constructor().copy( this );
    */

    return new Geometry().copy(this);
  }

  public copy(source: Geometry): this {
    // reset

    this.vertices = [];
    this.colors = [];
    this.faces = [];
    this.faceVertexUvs = [[]];
    this.morphTargets = [];
    this.morphNormals = [];
    this.skinWeights = [];
    this.skinIndices = [];
    this.lineDistances = [];
    this.boundingBox = null;
    this.boundingSphere = null;

    // name

    this.name = source.name;

    // vertices

    const vertices = source.vertices;

    for (let i = 0, il = vertices.length; i < il; i++) {
      this.vertices.push(vertices[i].clone());
    }

    // colors

    const colors = source.colors;

    for (let i = 0, il = colors.length; i < il; i++) {
      this.colors.push(colors[i].clone());
    }

    // faces

    const faces = source.faces;

    for (let i = 0, il = faces.length; i < il; i++) {
      this.faces.push(faces[i].clone());
    }

    // face vertex uvs

    for (let i = 0, il = source.faceVertexUvs.length; i < il; i++) {
      const faceVertexUvs = source.faceVertexUvs[i];

      if (this.faceVertexUvs[i] === undefined) {
        this.faceVertexUvs[i] = [];
      }

      for (let j = 0, jl = faceVertexUvs.length; j < jl; j++) {
        const uvs = faceVertexUvs[j],
          uvsCopy = [];

        for (let k = 0, kl = uvs.length; k < kl; k++) {
          const uv = uvs[k];

          uvsCopy.push(uv.clone());
        }

        this.faceVertexUvs[i].push(uvsCopy);
      }
    }

    // morph targets

    const morphTargets = source.morphTargets;

    for (let i = 0, il = morphTargets.length; i < il; i++) {
      const morphTarget: MorphTarget = {
        name: morphTargets[i].name,
      };

      // vertices

      if (morphTargets[i].vertices !== undefined) {
        morphTarget.vertices = [];

        for (let j = 0, jl = morphTargets[i].vertices!.length; j < jl; j++) {
          morphTarget.vertices.push(morphTargets[i].vertices![j].clone());
        }
      }

      // normals

      if (morphTargets[i].normals !== undefined) {
        morphTarget.normals = [];

        for (let j = 0, jl = morphTargets[i].normals!.length; j < jl; j++) {
          morphTarget.normals.push(morphTargets[i].normals![j].clone());
        }
      }

      this.morphTargets.push(morphTarget);
    }

    // morph normals

    const morphNormals = source.morphNormals;

    for (let i = 0, il = morphNormals.length; i < il; i++) {
      const morphNormal: MorphNormals = {};

      // vertex normals

      if (morphNormals[i].vertexNormals !== undefined) {
        morphNormal.vertexNormals = [];

        for (
          let j = 0, jl = morphNormals[i].vertexNormals!.length;
          j < jl;
          j++
        ) {
          const srcVertexNormal = morphNormals[i].vertexNormals![j];
          const destVertexNormal = new Triangle();

          destVertexNormal.a = srcVertexNormal.a.clone();
          destVertexNormal.b = srcVertexNormal.b.clone();
          destVertexNormal.c = srcVertexNormal.c.clone();

          morphNormal.vertexNormals.push(destVertexNormal);
        }
      }

      // face normals

      if (morphNormals[i].faceNormals !== undefined) {
        morphNormal.faceNormals = [];

        for (let j = 0, jl = morphNormals[i].faceNormals!.length; j < jl; j++) {
          morphNormal.faceNormals.push(morphNormals[i].faceNormals![j].clone());
        }
      }

      this.morphNormals.push(morphNormal);
    }

    // skin weights

    const skinWeights = source.skinWeights;

    for (let i = 0, il = skinWeights.length; i < il; i++) {
      this.skinWeights.push(skinWeights[i].clone());
    }

    // skin indices

    const skinIndices = source.skinIndices;

    for (let i = 0, il = skinIndices.length; i < il; i++) {
      this.skinIndices.push(skinIndices[i].clone());
    }

    // line distances

    const lineDistances = source.lineDistances;

    for (let i = 0, il = lineDistances.length; i < il; i++) {
      this.lineDistances.push(lineDistances[i]);
    }

    // bounding box

    const boundingBox = source.boundingBox;

    if (boundingBox !== null) {
      this.boundingBox = boundingBox.clone();
    }

    // bounding sphere

    const boundingSphere = source.boundingSphere;

    if (boundingSphere !== null) {
      this.boundingSphere = boundingSphere.clone();
    }

    // update flags

    this.elementsNeedUpdate = source.elementsNeedUpdate;
    this.verticesNeedUpdate = source.verticesNeedUpdate;
    this.uvsNeedUpdate = source.uvsNeedUpdate;
    this.normalsNeedUpdate = source.normalsNeedUpdate;
    this.colorsNeedUpdate = source.colorsNeedUpdate;
    this.lineDistancesNeedUpdate = source.lineDistancesNeedUpdate;
    this.groupsNeedUpdate = source.groupsNeedUpdate;

    return this;
  }

  public toBufferGeometry(): BufferGeometry {
    const geometry = new DirectGeometry().fromGeometry(this);

    const buffergeometry = new BufferGeometry();

    const positions = new Float32Array(geometry.vertices.length * 3);
    buffergeometry.setAttribute(
      "position",
      copyVector3sArray(new BufferAttribute(positions, 3), geometry.vertices),
    );

    if (geometry.normals.length > 0) {
      const normals = new Float32Array(geometry.normals.length * 3);
      buffergeometry.setAttribute(
        "normal",
        copyVector3sArray(new BufferAttribute(normals, 3), geometry.normals),
      );
    }

    if (geometry.colors.length > 0) {
      const colors = new Float32Array(geometry.colors.length * 3);
      buffergeometry.setAttribute(
        "color",
        copyColorsArray(new BufferAttribute(colors, 3), geometry.colors),
      );
    }

    if (geometry.uvs.length > 0) {
      const uvs = new Float32Array(geometry.uvs.length * 2);
      buffergeometry.setAttribute(
        "uv",
        copyVector2sArray(new BufferAttribute(uvs, 2), geometry.uvs),
      );
    }

    if (geometry.uvs2.length > 0) {
      const uvs2 = new Float32Array(geometry.uvs2.length * 2);
      buffergeometry.setAttribute(
        "uv2",
        copyVector2sArray(new BufferAttribute(uvs2, 2), geometry.uvs2),
      );
    }

    // groups

    buffergeometry.groups = geometry.groups;

    // morphs

    for (let name in geometry.morphTargets) {
      const targetName: keyof MorphTargetsKeyed =
        name as keyof MorphTargetsKeyed;
      const array = [];
      const morphTargets = geometry.morphTargets[targetName]!;

      for (let i = 0, l = morphTargets.length; i < l; i++) {
        const morphTarget = morphTargets[i];

        const attribute = new Float32BufferAttribute(
          morphTarget.data.length * 3,
          3,
        );
        attribute.name = morphTarget.name!;
        copyVector3sArray(attribute, morphTarget.data);
        array.push(attribute);
      }

      buffergeometry.morphAttributes[targetName] = array;
    }

    // skinning

    if (geometry.skinIndices.length > 0) {
      const skinIndices = new Float32BufferAttribute(
        geometry.skinIndices.length * 4,
        4,
      );
      buffergeometry.setAttribute(
        "skinIndex",
        copyVector4sArray(skinIndices, geometry.skinIndices),
      );
    }

    if (geometry.skinWeights.length > 0) {
      const skinWeights = new Float32BufferAttribute(
        geometry.skinWeights.length * 4,
        4,
      );
      buffergeometry.setAttribute(
        "skinWeight",
        copyVector4sArray(skinWeights, geometry.skinWeights),
      );
    }

    //

    if (geometry.boundingSphere !== null) {
      buffergeometry.boundingSphere = geometry.boundingSphere.clone();
    }

    if (geometry.boundingBox !== null) {
      buffergeometry.boundingBox = geometry.boundingBox.clone();
    }

    return buffergeometry;
  }

  public computeTangents(): void {
    console.error("THREE.Geometry: .computeTangents() has been removed.");
  }

  public computeLineDistances(): void {
    console.error(
      "THREE.Geometry: .computeLineDistances() has been removed. Use THREE.Line.computeLineDistances() instead.",
    );
  }

  public applyMatrix(matrix: Matrix4): Geometry {
    console.warn(
      "THREE.Geometry: .applyMatrix() has been renamed to .applyMatrix4().",
    );
    return this.applyMatrix4(matrix);
  }

  public dispose(): void {
    this.dispatchEvent({ type: "dispose" });
  }
}

interface MorphTargetsKeyed {
  position?: NameDataPair[];
  normal?: NameDataPair[];
  color?: NameDataPair[];
}

class DirectGeometry {
  public vertices: Vector3[];
  public normals: Vector3[];
  public colors: Color[];
  public uvs: Vector2[];
  public uvs2: Vector2[];

  public groups: GeometryGroup[];

  public morphTargets: MorphTargetsKeyed;

  public skinWeights: Vector4[];
  public skinIndices: Vector4[];

  public boundingBox: Box3 | null;
  public boundingSphere: Sphere | null;

  // // update flags
  public verticesNeedUpdate: boolean;
  public normalsNeedUpdate: boolean;
  public colorsNeedUpdate: boolean;
  public uvsNeedUpdate: boolean;
  public groupsNeedUpdate: boolean;

  constructor() {
    this.vertices = [];
    this.normals = [];
    this.colors = [];
    this.uvs = [];
    this.uvs2 = [];

    this.groups = [];

    this.morphTargets = {};

    this.skinWeights = [];
    this.skinIndices = [];

    // this.lineDistances = [];

    this.boundingBox = null;
    this.boundingSphere = null;

    // update flags

    this.verticesNeedUpdate = false;
    this.normalsNeedUpdate = false;
    this.colorsNeedUpdate = false;
    this.uvsNeedUpdate = false;
    this.groupsNeedUpdate = false;
  }

  public computeGroups(geometry: Geometry): void {
    const groups = [];

    let group: GeometryGroup | undefined;
    let materialIndex = undefined;

    const faces = geometry.faces;
    let i;
    for (i = 0; i < faces.length; i++) {
      const face = faces[i];

      // materials

      if (face.materialIndex !== materialIndex) {
        materialIndex = face.materialIndex;

        if (group !== undefined) {
          group.count = i * 3 - group.start;
          groups.push(group);
        }

        group = {
          start: i * 3,
          count: -1, // Always re-assigned.
          materialIndex,
        };
      }
    }

    if (group !== undefined) {
      group.count = i * 3 - group.start;
      groups.push(group);
    }

    this.groups = groups;
  }

  public fromGeometry(geometry: Geometry): this {
    const faces = geometry.faces;
    const vertices = geometry.vertices;
    const faceVertexUvs = geometry.faceVertexUvs;

    const hasFaceVertexUv = faceVertexUvs[0] && faceVertexUvs[0].length > 0;
    const hasFaceVertexUv2 = faceVertexUvs[1] && faceVertexUvs[1].length > 0;

    // morphs

    const morphTargets = geometry.morphTargets;
    const morphTargetsLength = morphTargets.length;

    let morphTargetsPosition: NameDataPair[];

    if (morphTargetsLength > 0) {
      morphTargetsPosition = [];

      for (let i = 0; i < morphTargetsLength; i++) {
        morphTargetsPosition[i] = {
          name: morphTargets[i].name,
          data: [],
        };
      }

      this.morphTargets["position"] = morphTargetsPosition;
    }

    const morphNormals = geometry.morphNormals;
    const morphNormalsLength = morphNormals.length;

    let morphTargetsNormal: NameDataPair[];

    if (morphNormalsLength > 0) {
      morphTargetsNormal = [];

      for (let i = 0; i < morphNormalsLength; i++) {
        morphTargetsNormal[i] = {
          name: morphNormals[i].name,
          data: [],
        };
      }

      this.morphTargets["normal"] = morphTargetsNormal;
    }

    // skins

    const skinIndices = geometry.skinIndices;
    const skinWeights = geometry.skinWeights;

    const hasSkinIndices = skinIndices.length === vertices.length;
    const hasSkinWeights = skinWeights.length === vertices.length;

    //

    if (vertices.length > 0 && faces.length === 0) {
      console.error(
        "THREE.DirectGeometry: Faceless geometries are not supported.",
      );
    }

    for (let i = 0; i < faces.length; i++) {
      const face = faces[i];

      this.vertices.push(vertices[face.a], vertices[face.b], vertices[face.c]);

      const vertexNormals = face.vertexNormals;

      if (vertexNormals.length === 3) {
        this.normals.push(vertexNormals[0], vertexNormals[1], vertexNormals[2]);
      } else {
        const normal = face.normal;

        this.normals.push(normal, normal, normal);
      }

      const vertexColors = face.vertexColors;

      if (vertexColors.length === 3) {
        this.colors.push(vertexColors[0], vertexColors[1], vertexColors[2]);
      } else {
        const color = face.color;

        this.colors.push(color, color, color);
      }

      if (hasFaceVertexUv === true) {
        const vertexUvs = faceVertexUvs[0][i];

        if (vertexUvs !== undefined) {
          this.uvs.push(vertexUvs[0], vertexUvs[1], vertexUvs[2]);
        } else {
          console.warn(
            "THREE.DirectGeometry.fromGeometry(): Undefined vertexUv ",
            i,
          );

          this.uvs.push(new Vector2(), new Vector2(), new Vector2());
        }
      }

      if (hasFaceVertexUv2 === true) {
        const vertexUvs = faceVertexUvs[1][i];

        if (vertexUvs !== undefined) {
          this.uvs2.push(vertexUvs[0], vertexUvs[1], vertexUvs[2]);
        } else {
          console.warn(
            "THREE.DirectGeometry.fromGeometry(): Undefined vertexUv2 ",
            i,
          );

          this.uvs2.push(new Vector2(), new Vector2(), new Vector2());
        }
      }

      // morphs

      for (let j = 0; j < morphTargetsLength; j++) {
        const morphTarget = morphTargets[j].vertices!;

        morphTargetsPosition![j].data.push(
          morphTarget[face.a],
          morphTarget[face.b],
          morphTarget[face.c],
        );
      }

      for (let j = 0; j < morphNormalsLength; j++) {
        const morphNormal = morphNormals[j].vertexNormals![i];

        morphTargetsNormal![j].data.push(
          morphNormal.a,
          morphNormal.b,
          morphNormal.c,
        );
      }

      // skins

      if (hasSkinIndices) {
        this.skinIndices.push(
          skinIndices[face.a],
          skinIndices[face.b],
          skinIndices[face.c],
        );
      }

      if (hasSkinWeights) {
        this.skinWeights.push(
          skinWeights[face.a],
          skinWeights[face.b],
          skinWeights[face.c],
        );
      }
    }

    this.computeGroups(geometry);

    this.verticesNeedUpdate = geometry.verticesNeedUpdate;
    this.normalsNeedUpdate = geometry.normalsNeedUpdate;
    this.colorsNeedUpdate = geometry.colorsNeedUpdate;
    this.uvsNeedUpdate = geometry.uvsNeedUpdate;
    this.groupsNeedUpdate = geometry.groupsNeedUpdate;

    if (geometry.boundingSphere !== null) {
      this.boundingSphere = geometry.boundingSphere.clone();
    }

    if (geometry.boundingBox !== null) {
      this.boundingBox = geometry.boundingBox.clone();
    }

    return this;
  }
}

/**
 * Triangle face.
 */
export class Face3 {
  // internal helpers used by Geometry methods
  public __originalFaceNormal?: Vector3;
  public __originalVertexNormals?: any[];
  public _id?: number;
  /**
   * Vertex A index.
   */
  public a: number;

  /**
   * Vertex B index.
   */
  public b: number;

  /**
   * Vertex C index.
   */
  public c: number;

  /**
   * Face normal.
   * @default new THREE.Vector3()
   */
  public normal: Vector3;

  /**
   * Array of 3 vertex normals.
   * @default []
   */
  public vertexNormals: Vector3[];

  /**
   * Face color.
   * @default new THREE.Color()
   */
  public color: Color;

  /**
   * Array of 3 vertex colors.
   * @default []
   */
  public vertexColors: Color[];

  /**
   * Material index (points to {@link Mesh.material}).
   * @default 0
   */
  public materialIndex: number;

  /**
   * @param a Vertex A index.
   * @param b Vertex B index.
   * @param c Vertex C index.
   * @param normal Face normal or array of vertex normals.
   * @param color Face color or array of vertex colors.
   * @param materialIndex Material index.
   */
  public constructor(
    a: number,
    b: number,
    c: number,
    normal?: Vector3 | Vector3[],
    color?: Color | Color[],
    materialIndex: number = 0,
  ) {
    this.a = a;
    this.b = b;
    this.c = c;

    this.normal =
      normal && (normal as Vector3).isVector3
        ? (normal as Vector3)
        : new Vector3();
    this.vertexNormals = Array.isArray(normal) ? normal : [];

    this.color =
      color && (color as Color).isColor ? (color as Color) : new Color();
    this.vertexColors = Array.isArray(color) ? color : [];

    this.materialIndex = materialIndex;
  }

  public clone(): this {
    return new (this.constructor as any)().copy(this);
  }

  public copy(source: Face3): this {
    this.a = source.a;
    this.b = source.b;
    this.c = source.c;

    this.normal.copy(source.normal);
    this.color.copy(source.color);

    this.materialIndex = source.materialIndex;

    for (let i = 0, il = source.vertexNormals.length; i < il; i++) {
      this.vertexNormals[i] = source.vertexNormals[i].clone();
    }

    for (let i = 0, il = source.vertexColors.length; i < il; i++) {
      this.vertexColors[i] = source.vertexColors[i].clone();
    }

    return this;
  }
}

// Originally part of BufferAttribute, was removed in https://github.com/mrdoob/three.js/pull/24550
function copyColorsArray(
  attr: Float32BufferAttribute,
  colors: Color[],
): BufferAttribute {
  const array = attr.array as Float32Array;
  let offset = 0;

  for (let i = 0, l = colors.length; i < l; i++) {
    let color = colors[i];

    if (color === undefined) {
      console.warn(
        "THREE.BufferAttribute.copyColorsArray(): color is undefined",
        i,
      );
      color = new Color();
    }

    if (attr.normalized) {
      array[offset++] = normalize(color.r, array);
      array[offset++] = normalize(color.g, array);
      array[offset++] = normalize(color.b, array);
    } else {
      array[offset++] = color.r;
      array[offset++] = color.g;
      array[offset++] = color.b;
    }
  }

  return attr;
}

function copyVector2sArray(
  attr: BufferAttribute,
  vectors: Vector2[],
): BufferAttribute {
  const array = attr.array as Float32Array;
  let offset = 0;

  for (let i = 0, l = vectors.length; i < l; i++) {
    let vector = vectors[i];

    if (vector === undefined) {
      console.warn(
        "THREE.BufferAttribute.copyVector2sArray(): vector is undefined",
        i,
      );
      vector = new Vector2();
    }

    if (attr.normalized) {
      array[offset++] = normalize(vector.x, array);
      array[offset++] = normalize(vector.y, array);
    } else {
      array[offset++] = vector.x;
      array[offset++] = vector.y;
    }
  }

  return attr;
}

function copyVector3sArray(
  attr: BufferAttribute,
  vectors: Vector3[],
): BufferAttribute {
  const array = attr.array as Float32Array;
  let offset = 0;

  for (let i = 0, l = vectors.length; i < l; i++) {
    let vector = vectors[i];

    if (vector === undefined) {
      console.warn(
        "THREE.BufferAttribute.copyVector3sArray(): vector is undefined",
        i,
      );
      vector = new Vector3();
    }

    if (attr.normalized) {
      array[offset++] = normalize(vector.x, array);
      array[offset++] = normalize(vector.y, array);
      array[offset++] = normalize(vector.z, array);
    } else {
      array[offset++] = vector.x;
      array[offset++] = vector.y;
      array[offset++] = vector.z;
    }
  }

  return attr;
}

function copyVector4sArray(
  attr: BufferAttribute,
  vectors: Vector4[],
): BufferAttribute {
  const array = attr.array as Float32Array;
  let offset = 0;

  for (let i = 0, l = vectors.length; i < l; i++) {
    let vector = vectors[i];

    if (vector === undefined) {
      console.warn(
        "THREE.BufferAttribute.copyVector4sArray(): vector is undefined",
        i,
      );
      vector = new Vector4();
    }

    if (attr.normalized) {
      array[offset++] = normalize(vector.x, array);
      array[offset++] = normalize(vector.y, array);
      array[offset++] = normalize(vector.z, array);
      array[offset++] = normalize(vector.w, array);
    } else {
      array[offset++] = vector.x;
      array[offset++] = vector.y;
      array[offset++] = vector.z;
      array[offset++] = vector.w;
    }
  }

  return attr;
}
