import { FORM } from "../../../packages/lib/models/FORM";
import { get, $setting } from "./settings";
import { $$log, $$hex } from "../../../packages/lib/utils/debug";
import { FormToThreeJs } from "../../../packages/lib/models/FormToThreeJs";
import { Button, ToggleButton } from "../controls";
import * as React from "react";
import { MTNX } from "../../../packages/lib/models/MTNX";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
  GLTFExporter,
  GLTFExporterOptions,
} from "three/addons/exporters/GLTFExporter.js";
import { MtnxToThreeJs } from "../../../packages/lib/models/MtnxToThreeJs";
import { pad } from "../../../packages/lib/utils/string";
import { saveAs } from "file-saver";
import { isDebug } from "../debug";

import exportImage from "../img/model/export.png";

import "../css/models.scss";
import { romhandler } from "../../../packages/lib/romhandler";

interface IModelViewerProps {
  // bgColor: number;
  // selectedAnim: number;
  // selectedModel: number;
  // selectedModelDir: number;
  // selectedModelFile: number;
  // showTextures: boolean;
  // showVertexNormals: boolean;
  // showWireframe: boolean;
  // useCamera: boolean;
}

interface IModelViewerState {
  bgColor: number;
  selectedAnim: string | null;
  selectedAnimDir: number | null;
  selectedAnimFile: number | null;
  selectedModel: string;
  selectedModelDir: number | null;
  selectedModelFile: number | null;
  showTextures: boolean;
  showVertexNormals: boolean;
  showWireframe: boolean;
  useCamera: boolean;
}

export class ModelViewer extends React.Component<
  IModelViewerProps,
  IModelViewerState
> {
  private modelToolbar: ModelToolbar | null = null;

  constructor(props: IModelViewerProps) {
    super(props);

    this.state = {
      selectedModel: "",
      selectedModelDir: null,
      selectedModelFile: null,
      selectedAnim: "",
      selectedAnimDir: null,
      selectedAnimFile: null,
      bgColor: 0x000000,
      showTextures: true,
      showWireframe: false,
      showVertexNormals: false,
      useCamera: false,
    };

    // Set first model, start at dir 2 so it's Mario.
    const mainfs = romhandler.getRom()?.getMainFS()!;
    const mainfsDirCount = mainfs.getDirectoryCount();
    for (let d = 2; d < mainfsDirCount; d++) {
      const dirFileCount = mainfs.getFileCount(d);
      for (let f = 0; f < dirFileCount; f++) {
        const file = mainfs.get(d, f);
        if (FORM.isForm(file)) {
          const name = d + "/" + f;
          (this as any).state.selectedModel = name;
          (this as any).state.selectedModelDir = d;
          (this as any).state.selectedModelFile = f;
          return;
        }
      }
    }
  }

  render() {
    return (
      <div
        className="modelViewerContainer"
        tabIndex={-1}
        onKeyDownCapture={this.onKeyDown}
      >
        <ModelToolbar
          ref={(c) => {
            this.modelToolbar = c;
          }}
          selectedModel={this.state.selectedModel}
          onModelSelected={this.onModelSelected}
          selectedModelDir={this.state.selectedModelDir}
          selectedModelFile={this.state.selectedModelFile}
          selectedAnim={this.state.selectedAnim}
          onAnimSelected={this.onAnimSelected}
          selectedAnimDir={this.state.selectedAnimDir}
          selectedAnimFile={this.state.selectedAnimFile}
          bgColor={this.state.bgColor}
          onBgColorChange={this.onBgColorChange}
          showTextures={this.state.showTextures}
          showWireframe={this.state.showWireframe}
          showVertexNormals={this.state.showVertexNormals}
          useCamera={this.state.useCamera}
          onFeatureChange={this.onFeatureChange}
        />
        <ModelRenderer
          selectedModelDir={this.state.selectedModelDir}
          selectedModelFile={this.state.selectedModelFile}
          selectedAnimDir={this.state.selectedAnimDir}
          selectedAnimFile={this.state.selectedAnimFile}
          bgColor={this.state.bgColor}
          showTextures={this.state.showTextures}
          showWireframe={this.state.showWireframe}
          showVertexNormals={this.state.showVertexNormals}
          useCamera={this.state.useCamera}
        />
      </div>
    );
  }

  onModelSelected = (model: string) => {
    const pieces = model.match(/^(\d+)\/(\d+)/);
    if (!pieces)
      throw new Error(
        `Could not parse selected model string ${this.state.selectedModel}`,
      );

    const [, dir, file] = pieces;

    this.setState({
      selectedModel: model,
      selectedModelDir: dir,
      selectedModelFile: file,

      // Clear the animation
      selectedAnim: "",
      selectedAnimDir: null,
      selectedAnimFile: null,
    } as any);
  };

  onAnimSelected = (anim: string) => {
    if (!anim) {
      this.setState({
        selectedAnim: "",
        selectedAnimDir: null,
        selectedAnimFile: null,
      });
      return;
    }

    const pieces = anim.match(/^(\d+)\/(\d+)/);
    if (!pieces) {
      throw new Error(`Error parsing anim string ${anim}`);
    }

    const [, dir, file] = pieces;

    this.setState({
      selectedAnim: anim,
      selectedAnimDir: dir,
      selectedAnimFile: file,
    } as any);
  };

  onBgColorChange = (color: number) => {
    this.setState({
      bgColor: color,
    });
  };

  onFeatureChange = (features: any) => {
    this.setState(features);
  };

  onKeyDown = (event: any) => {
    if (event.key && this.modelToolbar) {
      const key = event.key.toLowerCase();
      if (key === "m") {
        this.modelToolbar.focusModelSelect();
      } else if (key === "a") {
        this.modelToolbar.focusAnimSelect();
      }
    }
  };
}

let _modelRenderer: ModelRenderer | null = null;
let renderTimeout: any = null;
let camera: THREE.PerspectiveCamera | null = null;
let scene: THREE.Scene | null = null;
let renderer: THREE.WebGLRenderer | null = null;
let controls: OrbitControls | null = null;
let clock: THREE.Clock | null = null;
let mixer: THREE.AnimationMixer | null = null;

interface IModelRendererProps {
  selectedAnimFile: number | null;
  selectedAnimDir: number | null;
  selectedModelDir: number | null;
  selectedModelFile: number | null;
  bgColor: number;
  showTextures: boolean;
  showVertexNormals: boolean;
  showWireframe: boolean;
  useCamera: boolean;
}

class ModelRenderer extends React.Component<IModelRendererProps> {
  private __container: HTMLDivElement | null = null;

  state = {
    hasError: false,
  };

  render() {
    if (this.state.hasError) {
      return (
        <p>An error occurred during rendering, see the browser console.</p>
      );
    }

    return (
      <div
        className="modelRenderContainer"
        style={{
          backgroundColor: "#" + pad($$hex(this.props.bgColor, ""), 6, "0"),
        }}
        ref={(el) => (this.__container = el)}
      />
    );
  }

  componentDidCatch(error: Error, info: any) {
    this.setState({ hasError: true });
    console.error(error, info);
  }

  componentDidMount() {
    try {
      window.addEventListener("resize", this.onWindowResize);
      _modelRenderer = this;
      this.initModel();
    } catch (e) {
      console.error(e);
    }
  }

  componentWillUnmount() {
    try {
      window.removeEventListener("resize", this.onWindowResize);
      _modelRenderer = null;
      this.clearViewer();
    } catch (e) {
      console.error(e);
    }
  }

  componentDidUpdate() {
    try {
      this.clearViewer();
      this.initModel();
    } catch (e) {
      console.error(e);
    }
  }

  onWindowResize = () => {
    if (renderer && camera) {
      const container = this.__container!;
      const height = container.offsetHeight;
      const width = container.offsetWidth;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      renderer.setSize(width, height);
    }
  };

  clearViewer() {
    this.disposeTHREERenderer();
    this.disposeTHREEObj(scene);
    scene = null;
    if (mixer) {
      mixer.stopAllAction();
      mixer = null;
    }
    if (clock) {
      clock.stop();
      clock = null;
    }
    if (renderTimeout !== null) {
      clearTimeout(renderTimeout);
      renderTimeout = null;
    }
  }

  disposeTHREERenderer() {
    if (!renderer) return;

    renderer.dispose();
    renderer.forceContextLoss();

    const container = this.__container;
    if (container) container.innerHTML = "";

    (renderer as any).domElement = undefined;
    renderer = null;
  }

  disposeTHREEObj(obj: any) {
    if (!obj) {
      return;
    }

    for (let i = 0; i < obj.children.length; i++) {
      this.disposeTHREEObj(obj.children[i]);
    }

    if (obj.geometry) {
      obj.geometry.dispose();
      obj.geometry = undefined;
    }
    if (obj.material) {
      let materialArray;
      if (obj.material instanceof Array) {
        materialArray = obj.material;
      }
      if (materialArray) {
        materialArray.forEach(function (mtrl: any) {
          if (mtrl.map) mtrl.map.dispose();
          if (mtrl.lightMap) mtrl.lightMap.dispose();
          if (mtrl.bumpMap) mtrl.bumpMap.dispose();
          if (mtrl.normalMap) mtrl.normalMap.dispose();
          if (mtrl.specularMap) mtrl.specularMap.dispose();
          if (mtrl.envMap) mtrl.envMap.dispose();
          mtrl.dispose();
        });
      } else {
        if (obj.material.map) obj.material.map.dispose();
        if (obj.material.lightMap) obj.material.lightMap.dispose();
        if (obj.material.bumpMap) obj.material.bumpMap.dispose();
        if (obj.material.normalMap) obj.material.normalMap.dispose();
        if (obj.material.specularMap) obj.material.specularMap.dispose();
        if (obj.material.envMap) obj.material.envMap.dispose();
        obj.material.dispose();
      }
    }
  }

  initModel() {
    if (this.props.selectedModelDir === null) {
      return;
    }

    const [dir, file] = [
      this.props.selectedModelDir,
      this.props.selectedModelFile,
    ];

    const container = this.__container!;
    const height = container.offsetHeight;
    const width = container.offsetWidth;

    $$log(`Rendering model ${dir}/${file}`);

    const mainfs = romhandler.getRom()?.getMainFS()!;
    const form = FORM.unpack(mainfs.get(dir, file!))!;

    $$log("form", form);

    const converter = new FormToThreeJs();
    converter.bgColor = this.props.bgColor;
    converter.showTextures = this.props.showTextures;
    converter.showWireframe = this.props.showWireframe;
    converter.showVertexNormals = this.props.showVertexNormals;
    converter.useFormCamera = this.props.useCamera;

    converter.createModel(form).then((modelObj) => {
      scene = new THREE.Scene();
      scene.background = new THREE.Color(this.props.bgColor);
      scene.add(modelObj);

      $$log("Scene", scene);

      if (this.props.selectedAnimDir !== null) {
        const [dir, file] = [
          this.props.selectedAnimDir,
          this.props.selectedAnimFile,
        ];
        const mtnx = MTNX.unpack(mainfs.get(dir, file!))!;
        $$log("mtnx", mtnx);

        const animConverter = new MtnxToThreeJs();
        animConverter.form = form;
        const clip = animConverter.createClip(mtnx);
        $$log("mtnxClip", clip);

        mixer = new THREE.AnimationMixer(scene);
        const mtnxClipAction = mixer.clipAction(clip);
        mtnxClipAction.play();

        clock = new THREE.Clock();
      }

      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(width, height);

      container.appendChild(renderer.domElement);

      camera = converter.createCamera(form, width, height);

      controls = new OrbitControls(camera, renderer.domElement);

      this.animate();
    });
  }

  renderModel() {
    renderer!.render(scene!, camera!);
  }

  animate() {
    if (!_modelRenderer || !renderer) return;

    controls!.update();

    if (clock) {
      const delta = clock.getDelta();
      if (mixer) {
        mixer.update(delta);
      }
    }

    _modelRenderer.renderModel();

    if (get($setting.limitModelFPS)) {
      renderTimeout = setTimeout(function () {
        if (_modelRenderer) requestAnimationFrame(_modelRenderer.animate);
      }, 1000 / 30);
    } else {
      requestAnimationFrame(_modelRenderer.animate);
    }
  }
}

interface IModelToolbarProps {
  bgColor: number;
  selectedAnim: string | null;
  selectedAnimDir: number | null;
  selectedAnimFile: number | null;
  selectedModel: string;
  selectedModelDir: number | null;
  selectedModelFile: number | null;
  showTextures: boolean;
  showVertexNormals: boolean;
  showWireframe: boolean;
  useCamera: boolean;
  onBgColorChange(color: number): any;
  onFeatureChange(feature: any): any;
  onModelSelected(model: string): any;
  onAnimSelected(animation: string): any;
}

class ModelToolbar extends React.Component<IModelToolbarProps> {
  private animSelect: AnimSelect | null = null;
  private modelSelect: ModelSelect | null = null;

  state = {};

  render() {
    return (
      <div className="modelViewerToolbar">
        <ModelSelect
          ref={(c) => {
            this.modelSelect = c;
          }}
          selectedModel={this.props.selectedModel}
          onModelSelected={this.props.onModelSelected}
        />
        <AnimSelect
          ref={(c) => {
            this.animSelect = c;
          }}
          selectedAnim={this.props.selectedAnim}
          selectedModelDir={this.props.selectedModelDir}
          onAnimSelected={this.props.onAnimSelected}
        />
        <ModelBGColorSelect
          selectedColor={this.props.bgColor}
          onColorChange={this.props.onBgColorChange}
        />
        <ModelFeatureSelect
          showTextures={this.props.showTextures}
          showWireframe={this.props.showWireframe}
          showVertexNormals={this.props.showVertexNormals}
          useCamera={this.props.useCamera}
          onFeatureChange={this.props.onFeatureChange}
        />
        <div className="modelViewerToolbarSpacer" />
        <ModelExportObjButton
          selectedModelDir={this.props.selectedModelDir}
          selectedModelFile={this.props.selectedModelFile}
          selectedAnimDir={this.props.selectedAnimDir}
          selectedAnimFile={this.props.selectedAnimFile}
        />
      </div>
    );
  }

  focusModelSelect = () => {
    if (this.modelSelect) {
      this.modelSelect.focus();
    }
  };

  focusAnimSelect = () => {
    if (this.animSelect) {
      this.animSelect.focus();
    }
  };
}

interface IModelSelectProps {
  selectedModel: string;
  onModelSelected(model: string): any;
}

class ModelSelect extends React.Component<IModelSelectProps> {
  private selectEl: HTMLElement | null = null;

  state = {};

  render() {
    const entries = this.getModelEntries();
    const options = entries.map((entry) => {
      const [d, f] = entry;
      const name = d + "/" + f;
      const tooltip =
        "0x" + pad($$hex(d, ""), 4, "0") + "/" + pad($$hex(f, ""), 4, "0");
      return (
        <option value={name} key={name} title={tooltip}>
          {name}
        </option>
      );
    });
    return (
      <div className="modelSelectContainer">
        Model:
        <select
          ref={(e) => {
            this.selectEl = e;
          }}
          value={this.props.selectedModel}
          onChange={this.modelSelected}
        >
          {options}
        </select>
      </div>
    );
  }

  focus = () => {
    if (this.selectEl) this.selectEl.focus();
  };

  modelSelected = (e: any) => {
    if (this.props.onModelSelected) this.props.onModelSelected(e.target.value);
  };

  getModelEntries(): [number, number][] {
    const entries: [number, number][] = [];
    const mainfs = romhandler.getRom()?.getMainFS()!;
    const mainfsDirCount = mainfs.getDirectoryCount();
    for (let d = 0; d < mainfsDirCount; d++) {
      const dirFileCount = mainfs.getFileCount(d);
      for (let f = 0; f < dirFileCount; f++) {
        const file = mainfs.get(d, f);
        if (FORM.isForm(file)) {
          try {
            // let form = FORM.unpack(file);
            // if (form.STRG && form.STRG[0] && form.STRG[0].parsed)
            //   name += ` (${form.STRG[0].parsed[0]})`;
            entries.push([d, f]);
          } catch (e) {
            console.error(`Could not parse FORM ${d}/${f}`, e);
          }
        }
      }
    }
    return entries;
  }
}

interface IAnimSelectProps {
  selectedAnim: string | null;
  selectedModelDir: number | null;
  onAnimSelected(animation: string): any;
}

class AnimSelect extends React.Component<IAnimSelectProps> {
  private selectEl: HTMLElement | null = null;

  state = {};

  render() {
    const entries = this.getAnimEntries();
    const options = entries.map((entry) => {
      return (
        <option value={entry} key={entry}>
          {entry}
        </option>
      );
    });
    options.unshift(<option value={""} key={""}></option>);
    return (
      <div className="modelSelectContainer">
        Animation:
        <select
          ref={(e) => {
            this.selectEl = e;
          }}
          value={this.props.selectedAnim!}
          onChange={this.animSelected}
        >
          {options}
        </select>
      </div>
    );
  }

  focus = () => {
    if (this.selectEl) this.selectEl.focus();
  };

  animSelected = (e: any) => {
    if (this.props.onAnimSelected) this.props.onAnimSelected(e.target.value);
  };

  getAnimEntries() {
    let entries: string[] = [];

    if (this.props.selectedModelDir === null) return entries; // No model selected

    if (get($setting.limitModelAnimations)) {
      return this.getAnimationsInDir(this.props.selectedModelDir);
    } else {
      const mainfs = romhandler.getRom()?.getMainFS()!;
      const mainfsDirCount = mainfs.getDirectoryCount();
      for (let d = 0; d < mainfsDirCount; d++) {
        entries = entries.concat(this.getAnimationsInDir(d));
      }
      return entries;
    }
  }

  getAnimationsInDir(d: number) {
    const entries = [];
    const mainfs = romhandler.getRom()?.getMainFS()!;
    const dirFileCount = mainfs.getFileCount(d);
    for (let f = 0; f < dirFileCount; f++) {
      const file = mainfs.get(d, f);
      if (MTNX.isMtnx(file)) {
        const name = d + "/" + f;
        try {
          // let form = FORM.unpack(file);
          // if (form.STRG && form.STRG[0] && form.STRG[0].parsed)
          //   name += ` (${form.STRG[0].parsed[0]})`;
          entries.push(name);
        } catch (e) {
          console.error(`Could not parse MTNX ${d}/${f}`, e);
        }
      }
    }
    return entries;
  }
}

interface IModelBGColorSelectProps {
  selectedColor: number;
  onColorChange(color: number): any;
}

class ModelBGColorSelect extends React.Component<IModelBGColorSelectProps> {
  state = {};

  render() {
    let motionTestColorBtn;
    if (isDebug()) {
      motionTestColorBtn = (
        <ToggleButton
          id={0xc6e7ff}
          key={2}
          allowDeselect={false}
          onToggled={this.onColorChange}
          pressed={this.props.selectedColor === 0xc6e7ff}
        >
          <span
            className="colorSwatch"
            title="Change background to MP3 motion test (0xC6E7FF)"
            style={{ backgroundColor: "#C6E7FF" }}
          ></span>
        </ToggleButton>
      );
    }

    return (
      <div className="modelViewerColorPicker">
        <ToggleButton
          id={0x000000}
          key={0}
          allowDeselect={false}
          onToggled={this.onColorChange}
          pressed={this.props.selectedColor === 0x000000}
        >
          <span
            className="colorSwatch"
            title="Change background to black"
            style={{ backgroundColor: "#000000" }}
          ></span>
        </ToggleButton>
        <ToggleButton
          id={0xffffff}
          key={1}
          allowDeselect={false}
          onToggled={this.onColorChange}
          pressed={this.props.selectedColor === 0xffffff}
        >
          <span
            className="colorSwatch"
            title="Change background to white"
            style={{ backgroundColor: "#FFFFFF" }}
          ></span>
        </ToggleButton>
        {motionTestColorBtn}
      </div>
    );
  }

  onColorChange = (id: number, pressed: boolean) => {
    this.setState({ color: id });
    this.props.onColorChange(id);
  };
}

interface IModelFeatureSelectProps {
  showVertexNormals: boolean;
  showTextures: boolean;
  showWireframe: boolean;
  useCamera: boolean;
  onFeatureChange(features: any): any;
}

class ModelFeatureSelect extends React.Component<IModelFeatureSelectProps> {
  state = {};

  render() {
    let advancedFeatures;
    if (get($setting.uiAdvanced)) {
      advancedFeatures = [
        <label key="modelFeatureSelectShowVertexNormals">
          <input
            type="checkbox"
            checked={this.props.showVertexNormals}
            onChange={this.onShowNormalsChange}
          />
          Vertex Normals
        </label>,
      ];
    }
    return (
      <div className="modelFeatureSelectContainer">
        <label key="modelFeatureSelectShowTextures">
          <input
            type="checkbox"
            checked={this.props.showTextures}
            onChange={this.onShowTextureChange}
          />
          Textures
        </label>
        <label key="modelFeatureSelectShowWireframe">
          <input
            type="checkbox"
            checked={this.props.showWireframe}
            onChange={this.onShowWireframeChange}
          />
          Wireframe
        </label>
        <label
          key="modelFeatureSelectUseCamera"
          title="Use the camera defined by the model"
        >
          <input
            type="checkbox"
            checked={this.props.useCamera}
            onChange={this.onUseCameraChange}
          />
          Camera
        </label>
        {advancedFeatures}
      </div>
    );
  }

  onShowTextureChange = (event: any) => {
    const pressed = event.target.checked;
    if (!pressed && !this.props.showWireframe) {
      this.props.onFeatureChange({
        showTextures: pressed,
        showWireframe: true,
      });
    } else {
      this.props.onFeatureChange({
        showTextures: pressed,
      });
    }
  };

  onShowWireframeChange = (event: any) => {
    const pressed = event.target.checked;
    if (!pressed && !this.props.showTextures) {
      this.props.onFeatureChange({
        showTextures: true,
        showWireframe: pressed,
      });
    } else {
      this.props.onFeatureChange({
        showWireframe: pressed,
      });
    }
  };

  onShowNormalsChange = (event: any) => {
    const pressed = event.target.checked;
    this.props.onFeatureChange({
      showVertexNormals: pressed,
    });
  };

  onUseCameraChange = (event: any) => {
    const pressed = event.target.checked;
    this.props.onFeatureChange({
      useCamera: pressed,
    });
  };
}

interface IModelExportObjButtonProps {
  selectedModelDir: number | null;
  selectedModelFile: number | null;
  selectedAnimDir: number | null;
  selectedAnimFile: number | null;
}

class ModelExportObjButton extends React.Component<IModelExportObjButtonProps> {
  state = {};

  render() {
    let tooltip;
    if (this.props.selectedAnimDir !== null) {
      tooltip = "Export current model and animation to a glTF model file";
    }
    //else {
    tooltip = "Export current model to a glTF model file";
    //}
    return (
      <Button onClick={this.export} css="btnModelExport" title={tooltip}>
        <img src={exportImage} height="16" width="16" alt="" />
        glTF
      </Button>
    );
  }

  export = async () => {
    const [dir, file] = [
      this.props.selectedModelDir,
      this.props.selectedModelFile,
    ];

    const mainfs = romhandler.getRom()?.getMainFS()!;
    const form = FORM.unpack(mainfs.get(dir!, file!))!;
    const converter = new FormToThreeJs();
    const modelObj = await converter.createModel(form);
    $$log("Exporting Three model object", modelObj);

    let clip: THREE.AnimationClip | undefined;
    // if (this.props.selectedAnimDir !== null) {
    //   const [dir, file] = [this.props.selectedAnimDir, this.props.selectedAnimFile];
    //   const mtnx = MTNX.unpack(mainfs.get(dir, file!))!;
    //   const animConverter = new MtnxToThreeJs();
    //   animConverter.form = form;
    //   clip = animConverter.createClip(mtnx);
    //   $$log("Exporting Three animation clip with model", clip);
    // }

    const binary = !!get($setting.modelUseGLB);
    const exporterOpts: GLTFExporterOptions = {
      binary,
    };
    if (clip) {
      exporterOpts.animations = [clip];
    }

    const exporter = new GLTFExporter();
    const result = await exporter.parseAsync(modelObj, exporterOpts);

    if (binary) {
      saveAs(new Blob([result as ArrayBuffer]), `model-${dir}-${file}.glb`);
    } else {
      saveAs(new Blob([JSON.stringify(result)]), `model-${dir}-${file}.gltf`);
    }
  };
}
