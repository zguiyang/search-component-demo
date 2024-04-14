import { render } from '@testing-library/react'
import App from '../src/App'
import {expect} from "vitest";

describe('App', () => {
  let inputElement:HTMLInputElement;
  let resultElement:HTMLDivElement;
  beforeEach(async () => {
  const app = render(<App />);
  inputElement = await app.findByTestId('input-search') as HTMLInputElement;
     resultElement = await app.findByTestId('search-result') as HTMLDivElement;

    // screen.debug();
  })
  it('renders the App component', async () => {
    expect(inputElement).toBeDefined();
    expect(resultElement).toBeDefined();
    expect(inputElement.placeholder).toBe('请输入关键字');
    expect(resultElement.textContent).toBe('无数据进行展示');
  })

})