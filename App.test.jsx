import { expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the birthday page', () => {
  render(<App />);
  const birthdayPage = screen.getByTitle('¡Feliz cumple, Pato!');
  expect(birthdayPage.getAttribute('src')).toBe('./birthday.html');
});
