import * as React from "react";
import { CodeMirrorWrapper } from "../components/codemirrorwrapper";
import { ToggleGroup } from "../controls";
import { showMessage, confirmFromUser } from "../appControl";
import { IBoard, IBoardEvent } from "../../../packages/lib/boards";
import { EventCodeLanguage } from "../../../packages/lib/types";

import "../css/basiccodeeditor.scss";

let _viewInstance: BasicCodeEditorView | null = null;

interface IBasicCodeEditorViewProps {
  board: IBoard;
  title: string;
  getExistingCode(): IBoardEvent | null;
  getDefaultCode(language: EventCodeLanguage): string;
  onSetCode(code: string, language: EventCodeLanguage): void;
  canSaveAndExit(code: string, language: EventCodeLanguage): Promise<string[]>;
}

interface IBasicCodeEditorViewState {
  code: string;
  language: EventCodeLanguage;
}

export class BasicCodeEditorView extends React.Component<
  IBasicCodeEditorViewProps,
  IBasicCodeEditorViewState
> {
  constructor(props: IBasicCodeEditorViewProps) {
    super(props);

    const currentCode = this.props.getExistingCode();
    if (currentCode) {
      this.state = {
        code: currentCode.code,
        language: currentCode.language,
      };
    } else {
      this.state = {
        code: this.props.getDefaultCode(EventCodeLanguage.C),
        language: EventCodeLanguage.C,
      };
    }
  }

  render() {
    const languageToggles = [
      {
        id: EventCodeLanguage.C,
        text: "C",
        selected: this.state.language === EventCodeLanguage.C,
      },
      {
        id: EventCodeLanguage.MIPS,
        text: "MIPS",
        selected: this.state.language === EventCodeLanguage.MIPS,
      },
    ];

    const codeMirrorMode =
      this.state.language === EventCodeLanguage.C ? "c" : "mips-pp64";

    return (
      <div className="basicCodeViewContainer">
        <h2>{this.props.title}</h2>
        <div className="editorSettingsSplit">
          <div>
            <CodeMirrorWrapper
              key={codeMirrorMode}
              mode={codeMirrorMode}
              className="eventcodemirror basiccodemirror"
              value={this.state.code}
              onChange={this.onCodeChangeInternal}
            />
          </div>
          <div className="createEventForm">
            <label>Language:</label>
            <ToggleGroup
              items={languageToggles}
              onToggleClick={this.onLanguageToggleClicked}
            />
          </div>
        </div>
      </div>
    );
  }

  componentDidMount() {
    _viewInstance = this;
  }

  componentWillUnmount() {
    _viewInstance = null;
  }

  onCodeChangeInternal = (code: string) => {
    this.setState({ code });
  };

  onLanguageToggleClicked = async (language: EventCodeLanguage) => {
    if (
      !this.codeHasChanged({ fromDefaultOnly: true }) ||
      (await confirmFromUser(
        "Are you sure you want to switch languages? The current code will not be kept.",
      ))
    ) {
      this.setState({
        language,
        code: this.props.getDefaultCode(language),
      });
    }
  };

  getCode = () => this.state.code;

  getLanguage = () => this.state.language;

  getBoard = () => this.props.board;

  getDefaultCodeForLanguage = (language: EventCodeLanguage) =>
    this.props.getDefaultCode(language);

  onSetCode = (code: string, language: EventCodeLanguage) =>
    this.props.onSetCode(code, language);

  canSaveAndExit = () =>
    this.props.canSaveAndExit(this.state.code, this.state.language);

  promptExit = async () => {
    if (this.codeHasChanged()) {
      return await confirmFromUser(
        "Are you sure you want to exit without saving your code?",
      );
    }
    return true;
  };

  private codeHasChanged(opts?: { fromDefaultOnly?: boolean }): boolean {
    const code = this.state.code;
    const oldCode = this.props.getExistingCode();

    const differentFromOldCode = oldCode && oldCode.code !== code;
    let differentFromDefaultCode =
      code !== this.props.getDefaultCode(this.state.language);
    if (differentFromDefaultCode && (!opts || !opts.fromDefaultOnly)) {
      differentFromDefaultCode = !oldCode;
    }
    return differentFromOldCode || differentFromDefaultCode;
  }
}

export async function saveBasicCodeEditorCode() {
  let code = _viewInstance!.getCode();
  const language = _viewInstance!.getLanguage();

  if (!code) {
    showMessage("No code was provided, any existing code will be removed.");
    _viewInstance!.onSetCode("", language);
    return;
  }

  const failures = await _viewInstance!.canSaveAndExit();
  if (failures.length > 0) {
    showMessage(failures.join("\n"));
    return;
  }

  if (code === _viewInstance!.getDefaultCodeForLanguage(language)) {
    code = "";
  }

  _viewInstance!.onSetCode(code, language);
}

export function basicCodeViewPromptExit(): Promise<boolean> {
  if (_viewInstance) {
    return _viewInstance.promptExit();
  }
  return Promise.resolve(true);
}
