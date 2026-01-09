// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';
// Provide a stable DOM implementation for tests using happy-dom
import { Window } from 'happy-dom';
const win = new Window();
// Debug log to confirm setup file runs
// eslint-disable-next-line no-console
console.log('setupTests.js executing, creating happy-dom globals');
global.window = global.window || win.window;
global.document = global.document || win.document;
global.HTMLElement = global.HTMLElement || win.HTMLElement;
global.navigator = global.navigator || { userAgent: 'node' };
