import * as React from "react";
import { Button } from "../controls";
import { openFile } from "../../../packages/lib/utils/input";
import { print as printBuffer } from "../../../packages/lib/utils/arrays";
import { romhandler } from "../../../packages/lib/romhandler";
import {
  images,
  load as loadDump,
  create as createDump,
  formImages,
  printSceneTable,
  printSceneN64Split,
  printSceneN64Splat,
  printSceneAsm,
  findStrings,
  findStrings3,
} from "../../../packages/lib/utils/dump";
import { ISceneInfo } from "../../../packages/lib/fs/scenes";
import { $$hex } from "../../../packages/lib/utils/debug";
import { strings3 } from "../../../packages/lib/fs/strings3";
import { strings } from "../../../packages/lib/fs/strings";
import { saveAs } from "file-saver";
import { makeDivisibleBy } from "../../../packages/lib/utils/number";
import { romToRAM } from "../../../packages/lib/utils/offsets";

import "../css/debug.scss";
import { blockUI } from "../appControl";
import { $$log } from "../../../packages/lib/utils/debug";
import { showMessage } from "../appControl";
import { $setting, get } from "./settings";

interface IDebugViewState {
  sceneIndex: string;
  sceneRamStartAddr: string;
  sceneCodeStartAddr: string;
  sceneCodeEndAddr: string;
  sceneRodataStartAddr: string;
  sceneRodataEndAddr: string;
  sceneBssStartAddr: string;
  sceneBssEndAddr: string;

  romToRamNumber: string;
  romToRamResult: string;

  mainfsToRomDir: string;
  mainfsToRomIndex: string;
  mainfsToRomResult: string;

  printStringDir: string;
  printStringIndex: string;
  findStringValue: string;
  printStringRaw: boolean;
}

export const DebugView = class DebugView extends React.Component<
  {},
  IDebugViewState
> {
  state = {
    sceneIndex: "",
    sceneRamStartAddr: "",
    sceneCodeStartAddr: "",
    sceneCodeEndAddr: "",
    sceneRodataStartAddr: "",
    sceneRodataEndAddr: "",
    sceneBssStartAddr: "",
    sceneBssEndAddr: "",

    romToRamNumber: "",
    romToRamResult: "",

    mainfsToRomDir: "",
    mainfsToRomIndex: "",
    mainfsToRomResult: "",

    printStringDir: "",
    printStringIndex: "",
    findStringValue: "",
    printStringRaw: false,
  };

  render() {
    const romLoaded = !!romhandler.getROMBuffer();

    let romFeatures;
    if (romLoaded) {
      romFeatures = (
        <>
          <Button onClick={onImportFileDumpClick}>Import file dump</Button>
          <Button onClick={onExportFileDumpClick}>Export file dump</Button>
          <br />
          <br />
          <Button onClick={images}>Dump images</Button>
          <Button onClick={formImages}>Print FORM images (console)</Button>
          <br />
          <br />
          <Button onClick={printSceneTable}>Print scene table (console)</Button>
          <Button onClick={printSceneN64Split}>
            Print scene table n64split (console)
          </Button>
          <Button onClick={printSceneN64Splat}>
            Print scene table n64splat (console)
          </Button>
          <br />
          <br />
          <input
            type="text"
            placeholder="Directory"
            className="dbInputShort"
            value={this.state.printStringDir}
            onChange={(e) => this.setState({ printStringDir: e.target.value })}
          />
          <input
            type="text"
            placeholder="Index"
            className="dbInputShort"
            value={this.state.printStringIndex}
            onChange={(e) =>
              this.setState({ printStringIndex: e.target.value })
            }
          />
          <Button onClick={this.onPrintStringClick}>
            Print string (console)
          </Button>
          <input
            type="checkbox"
            checked={this.state.printStringRaw}
            onChange={(e) =>
              this.setState({ printStringRaw: e.target.checked })
            }
          />{" "}
          <label>Raw?</label>
          <br />
          <input
            type="text"
            placeholder="Search string"
            className="dbInputShort"
            value={this.state.findStringValue}
            onChange={(e) => this.setState({ findStringValue: e.target.value })}
          />
          <Button onClick={this.onFindStringClick}>
            Find string (console)
          </Button>
          <br />
          <br />
          <input
            type="text"
            placeholder="ROM Offset"
            className="dbInputShort"
            value={this.state.romToRamNumber}
            onChange={(e) =>
              this.setState({
                romToRamNumber: e.target.value,
                romToRamResult: "",
              })
            }
          />
          <Button onClick={this.onRomToRamClick}>ROM {"->"} RAM</Button>
          <br />
          <span className="selectable dbMonospace">
            {this.state.romToRamResult}
          </span>
          <br />
          <br />
          <input
            type="text"
            placeholder="Directory"
            className="dbInputShort"
            value={this.state.mainfsToRomDir}
            onChange={(e) =>
              this.setState({
                mainfsToRomDir: e.target.value,
                mainfsToRomResult: "",
              })
            }
          />
          <input
            type="text"
            placeholder="Index"
            className="dbInputShort"
            value={this.state.mainfsToRomIndex}
            onChange={(e) =>
              this.setState({
                mainfsToRomIndex: e.target.value,
                mainfsToRomResult: "",
              })
            }
          />
          <Button onClick={this.onMainFSToRomClick}>MainFS {"->"} ROM</Button>
          <br />
          <span className="selectable dbMonospace">
            {this.state.mainfsToRomResult}
          </span>
          <br />
          <br />
          <input
            type="text"
            placeholder="Scene number"
            className="dbInputShort"
            value={this.state.sceneIndex}
            onChange={this.onSceneIndexChange}
          />
          <Button onClick={this.onPrintSceneAsmClick}>
            Print scene assembly (console)
          </Button>
          <Button onClick={this.onOverlayDownloadClick}>Download</Button>
          <Button onClick={this.onOverlayReplaceClick}>Replace</Button>
          <br />
          <table role="presentation">
            <tbody>
              <OverlayValueInput
                label="RAM start:"
                value={this.state.sceneRamStartAddr}
                onChange={this.makeSceneValueSetter("sceneRamStartAddr")}
              />
              <OverlayValueInput
                label="code start:"
                value={this.state.sceneCodeStartAddr}
                onChange={this.makeSceneValueSetter("sceneCodeStartAddr")}
              />
              <OverlayValueInput
                label="code end:"
                value={this.state.sceneCodeEndAddr}
                onChange={this.makeSceneValueSetter("sceneCodeEndAddr")}
              />
              <OverlayValueInput
                label="rodata start:"
                value={this.state.sceneRodataStartAddr}
                onChange={this.makeSceneValueSetter("sceneRodataStartAddr")}
              />
              <OverlayValueInput
                label="rodata end:"
                value={this.state.sceneRodataEndAddr}
                onChange={this.makeSceneValueSetter("sceneRodataEndAddr")}
              />
              <OverlayValueInput
                label="bss start:"
                value={this.state.sceneBssStartAddr}
                onChange={this.makeSceneValueSetter("sceneBssStartAddr")}
              />
              <OverlayValueInput
                label="bss end:"
                value={this.state.sceneBssEndAddr}
                onChange={this.makeSceneValueSetter("sceneBssEndAddr")}
              />
            </tbody>
          </table>
        </>
      );
    }

    return (
      <div id="debugView">
        <h3>Debug Functionality</h3>

        {!romLoaded && <p>Load a ROM to access more functionality here.</p>}

        {romFeatures}
      </div>
    );
  }

  onPrintSceneAsmClick = () => {
    const num = parseInt(this.state.sceneIndex);
    if (!isNaN(num)) {
      printSceneAsm(num);
    }
  };

  onPrintStringClick = () => {
    const strIndex = parseInt(this.state.printStringIndex, 16);
    if (isNaN(strIndex)) {
      return;
    }

    let result;
    const raw = this.state.printStringRaw;
    const isMP3 = romhandler.getGameVersion() === 3;
    let dirIndex: number;
    if (isMP3) {
      dirIndex = parseInt(this.state.printStringDir, 16);
      if (isNaN(dirIndex)) {
        return;
      }

      result = strings3.read("en", dirIndex, strIndex, raw);
    } else {
      result = strings.read(strIndex, raw);
    }

    if (result instanceof ArrayBuffer) {
      printBuffer(result);
    } else {
      console.log(result);
    }
  };

  onFindStringClick = () => {
    if (romhandler.getGameVersion() === 3) {
      findStrings3(this.state.findStringValue);
    } else {
      findStrings(this.state.findStringValue);
    }
  };

  onRomToRamClick = () => {
    let result = "";
    const num = parseInt(this.state.romToRamNumber, 16);
    if (!isNaN(num)) {
      const scenes = romhandler.getRom()!.getScenes();
      const sceneCount = scenes.count();
      for (let i = 0; i < sceneCount; i++) {
        const info = scenes.getInfo(i);
        if (info.rom_start <= num && num <= info.rom_end) {
          const diff = num - info.rom_start;
          result = `RAM: ${$$hex(info.ram_start + diff, "")}\n`;
          result += `Overlay ${i} (${$$hex(i)}) offset +${diff} (+${$$hex(
            diff,
          )})`;
          break;
        }
      }

      // Attempt to find an offset into a MainFS file.
      if (!result) {
        result = this.findInMainFS(num);
      }

      if (!result) {
        if (num >= 0x1000) {
          result = `RAM: ${$$hex(romToRAM(num))}`;
        }
      }
    }
    if (result) {
      this.setState({ romToRamResult: result });
    } else {
      this.setState({ romToRamResult: "Unknown" });
    }
  };

  onMainFSToRomClick = () => {
    let result = "";
    const dir = parseInt(this.state.mainfsToRomDir, 10);
    const file = parseInt(this.state.mainfsToRomIndex, 10);
    const mainfs = romhandler.getRom()?.getMainFS()!;
    if (!isNaN(dir) && !isNaN(file)) {
      let currentOffset = mainfs.getROMOffset()!;

      const dirCount = mainfs.getDirectoryCount();
      // Account for directory table.
      currentOffset += 4; // Count of directories
      currentOffset += 4 * dirCount; // Directory offsets

      for (let d = 0; d < dirCount; d++) {
        const fileCount = mainfs.getFileCount(d);

        // Account for file table.
        currentOffset += 4; // Count of files
        currentOffset += 4 * fileCount; // File offsets

        for (let f = 0; f < fileCount; f++) {
          currentOffset += mainfs.getFileHeaderSize(d, f); // Header

          if (d === dir && f === file) {
            result = `ROM: ${$$hex(currentOffset)}`;
            break;
          }

          const compressedSize = mainfs.getCompressedSize(d, f);
          currentOffset += compressedSize;
          currentOffset = makeDivisibleBy(currentOffset, 2);
        }

        if (result) break;
      }
    }

    this.setState({ mainfsToRomResult: result || "Unknown" });
  };

  private findInMainFS(num: number): string {
    const mainfs = romhandler.getRom()?.getMainFS()!;
    const mainfsOffset = mainfs.getROMOffset()!;
    const writeDecompressed = !!get($setting.writeDecompressed);
    const mainfsSize = mainfs.getByteLength(writeDecompressed);
    if (num > mainfsOffset && num < mainfsOffset + mainfsSize) {
      let currentOffset = mainfsOffset;
      const dirCount = mainfs.getDirectoryCount();
      for (let d = 0; d < dirCount; d++) {
        const fileCount = mainfs.getFileCount(d);
        for (let f = 0; f < fileCount; f++) {
          const compressedSize = mainfs.getCompressedSize(d, f);
          currentOffset += compressedSize;
          if (currentOffset > num) {
            const diff = num - (currentOffset - compressedSize);
            let result = `RAM: N/A\n`;
            result += `MainFS ${d}/${f} (${$$hex(d)}/${$$hex(
              f,
            )}) offset +${diff} (+${$$hex(diff)})`;
            return result;
          }
        }
      }
    }
    return "";
  }

  onSceneIndexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({ sceneIndex: e.target.value });

    const sceneIndex = parseInt(e.target.value);
    if (isNaN(sceneIndex)) {
      this.clearSceneValues();
      return;
    }
    const scenes = romhandler.getRom()!.getScenes();
    const sceneInfo = scenes.getInfo(sceneIndex);
    if (!sceneInfo) {
      this.clearSceneValues();
      return;
    }

    this.setState({ sceneRamStartAddr: $$hex(sceneInfo.ram_start, "") });
    this.setState({ sceneCodeStartAddr: $$hex(sceneInfo.code_start, "") });
    this.setState({ sceneCodeEndAddr: $$hex(sceneInfo.code_end, "") });
    this.setState({ sceneRodataStartAddr: $$hex(sceneInfo.rodata_start, "") });
    this.setState({ sceneRodataEndAddr: $$hex(sceneInfo.rodata_end, "") });
    this.setState({ sceneBssStartAddr: $$hex(sceneInfo.bss_start, "") });
    this.setState({ sceneBssEndAddr: $$hex(sceneInfo.bss_end, "") });
  };

  private makeSceneValueSetter(name: keyof IDebugViewState) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseInt(e.target.value, 16);
      if (isNaN(value)) {
        return;
      }
      this.setState({ [name]: $$hex(value, "") } as any);
    };
  }

  private clearSceneValues() {
    this.setState({ sceneRamStartAddr: "" });
    this.setState({ sceneCodeStartAddr: "" });
    this.setState({ sceneCodeEndAddr: "" });
    this.setState({ sceneRodataStartAddr: "" });
    this.setState({ sceneRodataEndAddr: "" });
    this.setState({ sceneBssStartAddr: "" });
    this.setState({ sceneBssEndAddr: "" });
  }

  onOverlayDownloadClick = () => {
    const num = parseInt(this.state.sceneIndex);
    if (!isNaN(num)) {
      const scenes = romhandler.getRom()!.getScenes();
      const dataView = scenes.getDataView(num);
      saveAs(new Blob([dataView]), `overlay-${num}.bin`);
    }
  };

  onOverlayReplaceClick = () => {
    const sceneIndex = parseInt(this.state.sceneIndex);
    if (isNaN(sceneIndex)) {
      return;
    }

    openFile("", (event) => {
      const file = (event.target! as HTMLInputElement).files![0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (error) => {
        const infoValues: Partial<ISceneInfo> = {
          ram_start: parseInt(this.state.sceneRamStartAddr, 16),
          code_start: parseInt(this.state.sceneCodeStartAddr, 16),
          code_end: parseInt(this.state.sceneCodeEndAddr, 16),
          rodata_start: parseInt(this.state.sceneRodataStartAddr, 16),
          rodata_end: parseInt(this.state.sceneRodataEndAddr, 16),
          bss_start: parseInt(this.state.sceneBssStartAddr, 16),
          bss_end: parseInt(this.state.sceneBssEndAddr, 16),
        };

        const scenes = romhandler.getRom()!.getScenes();
        scenes.replace(sceneIndex, reader.result as ArrayBuffer, infoValues);
      };
      reader.readAsArrayBuffer(file);
    });
  };
};

interface IOverlayValueInputProps {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

function OverlayValueInput(props: IOverlayValueInputProps) {
  return (
    <tr>
      <td>
        <label>{props.label}</label>
      </td>
      <td>
        <input
          type="text"
          className="dbInputShort"
          value={props.value}
          onChange={props.onChange}
        />
      </td>
    </tr>
  );
}

function onImportFileDumpClick() {
  openFile(".zip", dumpSelected);
}

function dumpSelected(event: any) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (error) => {
    // Extract the dump and replace ROM files.
    loadDump(reader.result as ArrayBuffer, (err: any) => {
      $$log(err);
      showMessage(`Something went wrong while loading the zip. ${err}`);
    });
  };
  reader.readAsArrayBuffer(file);
}

function onExportFileDumpClick() {
  blockUI(true);
  createDump(dumpCreated);
}

function dumpCreated(blob: Blob) {
  saveAs(blob, `mp${romhandler.getGameVersion()}-files.zip`);
  blockUI(false);
}
