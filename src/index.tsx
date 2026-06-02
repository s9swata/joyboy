#!/usr/bin/env node
import React from "react";
import { render } from "ink";
import { TerminalInfoProvider } from "ink-picture";
import { App } from "./tui/App.js";

render(
  <TerminalInfoProvider>
    <App />
  </TerminalInfoProvider>
);
