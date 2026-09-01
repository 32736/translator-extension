export const CONTENT_UI_STYLES = `
:host {
  all: initial;
  color: #161616;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

button {
  font: inherit;
}

.trigger {
  position: fixed;
  width: 28px;
  height: 28px;
  border: 1px solid #161616;
  border-radius: 7px;
  background: #ffffff;
  color: #161616;
  box-shadow: 0 2px 5px rgb(0 0 0 / 12%);
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
  line-height: 26px;
  padding: 0;
  pointer-events: auto;
}

.trigger:hover {
  background: #f0f0f0;
}

.popover {
  position: fixed;
  z-index: 1;
  width: 320px;
  border: 1px solid #e7e7e7;
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 5px 18px rgb(0 0 0 / 14%);
  padding: 14px;
  pointer-events: auto;
}

.popover-header,
.popover-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.popover-header {
  margin-bottom: 10px;
}

.popover-header strong {
  flex: 1;
  font-size: 13px;
}

.popover-source,
.popover-output,
.popover-status {
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.popover-source {
  border-bottom: 1px solid #e7e7e7;
  color: #707070;
  font-size: 12px;
  padding-bottom: 10px;
}

.popover-output {
  min-height: 44px;
  padding: 10px 0 4px;
  font-size: 17px;
}

.popover-status {
  min-height: 18px;
  color: #707070;
  font-size: 11px;
}

.popover[data-status="error"] .popover-status {
  color: #b3261e;
}

.popover button {
  border: 1px solid #e7e7e7;
  border-radius: 6px;
  background: #ffffff;
  color: #161616;
  cursor: pointer;
  font-size: 11px;
  padding: 5px 8px;
}

.popover button:hover {
  background: #f0f0f0;
}

.popover-close,
.popover-cancel {
  border: 0 !important;
  background: transparent !important;
  color: #707070 !important;
}

.popover-progress {
  height: 3px;
  margin: 4px 0 10px;
  overflow: hidden;
  border-radius: 99px;
  background: #e7e7e7;
}

.popover-progress-value {
  width: 0;
  height: 100%;
  background: #161616;
  transition: width 120ms ease-out;
}

.popover-actions {
  justify-content: flex-end;
  margin-top: 8px;
  flex-wrap: wrap;
}

@media (prefers-color-scheme: dark) {
  :host {
    color: #f4f4f4;
  }

  .trigger {
    border-color: #f4f4f4;
    background: #222222;
    color: #f4f4f4;
  }

  .trigger:hover {
    background: #343434;
  }

  .popover {
    border-color: #343434;
    background: #222222;
  }

  .popover-source {
    border-color: #343434;
  }

  .popover button {
    border-color: #343434;
    background: #222222;
    color: #f4f4f4;
  }

  .popover button:hover {
    background: #343434;
  }

  .popover-progress {
    background: #343434;
  }

  .popover-progress-value {
    background: #f4f4f4;
  }
}
`;
