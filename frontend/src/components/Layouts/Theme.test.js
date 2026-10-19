import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AdminLayout from './AdminLayout';
import InstructorLayout from './InstructorLayout';
import UserLayout from './UserLayout';
import Dashboard from '../User/Dashboard';
import useTheme from '../../hooks/useTheme';

// CRA's Jest resolver predates package exports used by React Router 7.
// These declarative APIs are re-exported unchanged by react-router-dom.
jest.mock('react-router-dom', () => {
  const { TextEncoder, TextDecoder } = jest.requireActual('util');
  Object.assign(global, { TextEncoder, TextDecoder });
  return jest.requireActual('react-router');
});

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ currentUser: { email: 'student@example.com' }, logout: jest.fn() })
}));

let container;
let root;

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.clear();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  jest.restoreAllMocks();
});

function renderLayout(Layout, child = <div>Page content</div>) {
  act(() => root.render(
    <React.StrictMode>
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/dashboard" element={child} />
            <Route path="/profile" element={<div>Profile page</div>} />
          </Route>
          <Route path="/login" element={<div>Login page</div>} />
        </Routes>
      </MemoryRouter>
    </React.StrictMode>
  ));
}

function click(element) {
  act(() => element.dispatchEvent(new MouseEvent('click', { bubbles: true })));
}

test.each([
  ['adminTheme', AdminLayout],
  ['instructorTheme', InstructorLayout],
  ['userTheme', UserLayout]
])('%s toggles both directions and restores the saved choice', (key, Layout) => {
  localStorage.setItem(key, 'dark');
  renderLayout(Layout);
  expect(document.documentElement.dataset.theme).toBe('dark');
  expect(document.body.classList.contains('dark-mode')).toBe(true);
  const toggle = container.querySelector('.app-theme-toggle-btn');
  expect(toggle.getAttribute('aria-pressed')).toBe('true');

  click(toggle);
  expect(document.documentElement.dataset.theme).toBe('light');
  expect(document.body.classList.contains('dark-mode')).toBe(false);
  expect(toggle.getAttribute('aria-pressed')).toBe('false');
  expect(localStorage.getItem(key)).toBe('light');

  click(toggle);
  expect(localStorage.getItem(key)).toBe('dark');
  act(() => root.unmount());
  root = createRoot(container);
  renderLayout(Layout);
  expect(document.documentElement.dataset.theme).toBe('dark');
});

test('dashboard and sidebar share one preference across navigation', () => {
  renderLayout(UserLayout, <Dashboard />);
  click(container.querySelector('.theme-toggle'));
  expect(container.querySelector('.app-theme-toggle-btn').getAttribute('aria-pressed')).toBe('true');
  expect(localStorage.getItem('userTheme')).toBe('dark');

  click(container.querySelector('.app-theme-toggle-btn'));
  expect(container.querySelector('.theme-toggle').getAttribute('aria-pressed')).toBe('false');

  click(container.querySelector('.theme-toggle'));
  click(container.querySelector('button[title="My Profile"]'));
  expect(container.textContent).toContain('Profile page');
  expect(document.documentElement.dataset.theme).toBe('dark');
});

test('unmounting the layout clears the theme from public pages', () => {
  localStorage.setItem('userTheme', 'dark');
  renderLayout(UserLayout);
  act(() => root.render(<div>Login page</div>));
  expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  expect(document.body.classList.contains('dark-mode')).toBe(false);
  expect(document.body.classList.contains('theme-transition')).toBe(false);
  expect(localStorage.getItem('userTheme')).toBe('dark');
});

test('the theme toggle remains labeled and usable when the sidebar is collapsed', () => {
  renderLayout(UserLayout);
  click(container.querySelector('button[title="Collapse sidebar"]'));
  const toggle = container.querySelector('.app-theme-toggle-btn');
  expect(toggle.getAttribute('aria-label')).toBe('Switch to dark mode');
  click(toggle);
  expect(toggle.getAttribute('aria-label')).toBe('Switch to light mode');
  expect(document.documentElement.dataset.theme).toBe('dark');
});

test('migrates the legacy dashboard setting without overriding the user preference', () => {
  localStorage.setItem('dashboardTheme', 'dark');
  renderLayout(UserLayout);
  expect(localStorage.getItem('userTheme')).toBe('dark');
  act(() => root.unmount());
  root = createRoot(container);
  localStorage.setItem('userTheme', 'light');
  renderLayout(UserLayout);
  expect(document.documentElement.dataset.theme).toBe('light');
});

test('invalid saved preferences default to light', () => {
  localStorage.setItem('adminTheme', 'invalid');
  renderLayout(AdminLayout);
  expect(document.documentElement.dataset.theme).toBe('light');
  expect(localStorage.getItem('adminTheme')).toBe('light');
});

test('the toggle still works if browser storage is blocked', () => {
  jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('Blocked'); });
  jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Blocked'); });
  function ThemeControl() {
    const { theme, toggleTheme } = useTheme('userTheme');
    return <button onClick={toggleTheme}>{theme}</button>;
  }
  act(() => root.render(<ThemeControl />));
  click(container.querySelector('button'));
  expect(document.documentElement.dataset.theme).toBe('dark');
});
