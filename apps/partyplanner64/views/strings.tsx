import * as React from "react";
import { romhandler } from "../../../packages/lib/romhandler";
import { arrayToArrayBuffer } from "../../../packages/lib/utils/arrays";
import {
  MPEditor,
  MPEditorDisplayMode,
  MPEditorToolbarPlacement,
  IMPEditorRef,
} from "../texteditor";

import "../css/strings.scss";

interface IStringsViewerState {
  hasError: boolean;
}

export class StringsViewer extends React.Component<{}, IStringsViewerState> {
  constructor(props: {}) {
    super(props);

    this.state = {
      hasError: false,
    };
  }

  render() {
    if (this.state.hasError) {
      return <p>An error was encountered.</p>;
    }

    const strs = [];
    let strCount;
    const game = romhandler.getGameVersion();
    if (game === 3) {
      const strings3 = romhandler.getRom()!.getStrings3();
      strCount = strings3.getStringCount("en", 0); // TODO
    } else {
      const strings = romhandler.getRom()!.getStrings();
      strCount = strings.getStringCount();
    }
    for (let s = 0; s < strCount; s++) {
      strs.push(<StringEditWrapper strIndex={s} />);
    }

    return (
      <div className="stringViewerContainer">
        <p>
          This is an experimental strings editor, probably doesn't work yet.
        </p>
        {strs}
      </div>
    );
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.setState({ hasError: true });
    console.error(error);
  }
}

interface IStringEditWrapperProps {
  strIndex: number;
}

class StringEditWrapper extends React.Component<IStringEditWrapperProps> {
  private editor: IMPEditorRef | null = null;

  state = {
    hasFocus: false,
  };

  render() {
    let str: string;
    const game = romhandler.getGameVersion();
    if (game === 3) {
      const strings3 = romhandler.getRom()!.getStrings3();
      str = strings3.read("en", 0, this.props.strIndex) as string; // TODO
    } else {
      const strings = romhandler.getRom()!.getStrings();
      str = strings.read(this.props.strIndex) as string;
    }

    return (
      <MPEditor
        ref={(editor) => {
          this.editor = editor;
        }}
        value={str}
        displayMode={MPEditorDisplayMode.Edit}
        showToolbar={true}
        toolbarPlacement={MPEditorToolbarPlacement.Top}
        onValueChange={this.onValueChanged}
        onFocus={this.onFocus}
        onBlur={this.onBlur}
      />
    );
  }

  componentDidMount() {
    if (this.state.hasFocus) this.editor!.focus();
  }

  componentDidUpdate() {
    if (this.state.hasFocus) this.editor!.focus();
  }

  onValueChanged = (id: any, val: string) => {
    const game = romhandler.getGameVersion()!;
    if (game === 3) return;
    else {
      const strings = romhandler.getRom()!.getStrings();
      const strBuffer = arrayToArrayBuffer(strings._strToBytes(val));
      strings.write(this.props.strIndex, strBuffer);
    }
  };

  onFocus = () => {
    this.setState({ hasFocus: true });
  };

  onBlur = () => {
    this.setState({ hasFocus: false });
  };
}

// class StringEditorToolbar extends React.Component {
//   state = {}

//   render() {
//     return (
//       <div className="stringEditorToolbar">

//       </div>
//     );
//   }
// }
