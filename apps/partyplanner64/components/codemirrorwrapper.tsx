import * as React from "react";
import CodeMirror from "codemirror";
import { normalizeLineEndings } from "../../../packages/lib/utils/string";
import "../utils/lib/mp-mips-autocomplete";
import "../utils/lib/mp-mips-codemirror";
import "codemirror/mode/clike/clike";

type CodeMirrorMode = "mips-pp64" | "c";

export interface ICodeMirrorWrapperProps {
  className?: string;
  value?: string;
  defaultValue?: string;
  options?: any;
  onChange?(code: string, change: unknown): void;
  mode?: CodeMirrorMode;
  readOnly?: boolean;
}

/**
 * Wrapper around the non-React CodeMirror library.
 * Heavily based off of https://github.com/JedWatson/react-codemirror
 */
export class CodeMirrorWrapper extends React.Component<ICodeMirrorWrapperProps> {
  private el: HTMLElement | null = null;
  private codemirror: CodeMirror.Editor | null = null;

  render() {
    let className = this.props.className;
    if (this.props.readOnly) {
      className += " CodeMirror-readonly";
    }

    return (
      <div
        ref={(el) => {
          this.el = el;
        }}
        className={className}
      ></div>
    );
  }

  componentDidMount() {
    const closureEl = this.el!;
    this.codemirror = CodeMirror(
      function (el: HTMLElement) {
        closureEl.appendChild(el);
      },
      {
        mode: getCodeMirrorMode(this.props.mode),
        indentUnit: getCodeMirrorIndent(this.props.mode),
        value: this.props.value || this.props.defaultValue || "",
        extraKeys: { "Ctrl-Space": "autocomplete" },
        readOnly: this.props.readOnly || false,
        viewportMargin: 3000,
      },
    ) as CodeMirror.Editor;
    this.codemirror.on("change", this.onInternalValueChanged);
  }

  componentWillUnmount() {
    this.codemirror = null;
  }

  componentDidUpdate(prevProps: ICodeMirrorWrapperProps) {
    if (
      this.codemirror &&
      this.props.value !== undefined &&
      this.props.value !== prevProps.value &&
      normalizeLineEndings(this.codemirror.getValue()) !==
        normalizeLineEndings(this.props.value)
    ) {
      this.codemirror.setValue(this.props.value);
    }
  }

  onInternalValueChanged = (doc: any, change: any) => {
    if (this.props.onChange && change.origin !== "setValue") {
      this.props.onChange(doc.getValue(), change);
    }
  };
}

function getCodeMirrorMode(modeProp: CodeMirrorMode | undefined): any {
  switch (modeProp) {
    case "c":
      return { name: "text/x-csrc" };

    case "mips-pp64":
    default:
      return "mips-pp64";
  }
}

function getCodeMirrorIndent(modeProp: CodeMirrorMode | undefined): number {
  switch (modeProp) {
    case "c":
      return 4;

    case "mips-pp64":
    default:
      return 2;
  }
}
