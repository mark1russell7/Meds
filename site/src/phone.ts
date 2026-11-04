/** This module starts the real root component of the app in the phone frame. */
import App from "@meds/app/App";
import { createElement } from "react";
import { createRoot } from "react-dom/client";

export function startPhone(element: HTMLElement): void {
  createRoot(element).render(createElement(App));
}
