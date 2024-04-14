import { test, expect } from '@playwright/test';

test.describe('search demo test', async  () => {
  test.beforeEach(async ({page}) => {
    await page.goto('http://localhost:5173/');
  })
  test('component should basic render', async ({page}) => {
    expect(await page.locator('#search-input').count()).toBe(1);
    expect(await page.locator('#search-input').inputValue()).toBe('');
    expect(await page.$eval('#search-input', (el:HTMLInputElement) => el.placeholder)).toBe('请输入关键字, a, b, c...');
    expect(await page.locator('#search-result').count()).toBe(1);
    expect ( await page.locator('.empty-hint').count()).toBe(1);
    expect ( await page.locator('.empty-hint').innerText()).toBe('无数据进行展示, 可输入关键字进行搜索');
  })
  test('should trigger input change event', async ({ page}) => {
    await page.fill('#search-input', 'k');
    const inputValue = await page.inputValue('#search-input');
    expect(inputValue).toBe('k');
    await page.waitForTimeout(2000);
    await page.waitForSelector('#search-result');
    const searchResultElement = await page.$('#search-result');
    const searchResultText = await searchResultElement?.textContent();
    // 验证搜索结果是否包含特定的字符串
    expect(searchResultText).toContain('Jack');
    const searchResultCount = await page.locator('#search-result li').count();
    expect(searchResultCount).toBe(1);
  })
  test('should search with multiple keywords', async ({page}) => {
    await page.fill('#search-input', 'ac');
    await page.waitForTimeout(2000);
    const searchResultCount2 = await page.locator('#search-result li').count();
    expect(searchResultCount2).toBe(2);
  })
  test ('should show loading hint when searching', async ({page}) => {
    expect(await page.locator('.loading-hint').count()).toBe(0);
    await page.fill('#search-input', 'a');
    await page.waitForTimeout(500);
    expect(await page.locator('.loading-hint').count()).toBe(1);
    await page.waitForTimeout(2000);
    expect(await page.locator('.loading-hint').count()).toBe(0);
  })
  test ('should show empty hint when no result', async ({page}) => {
    await page.fill('#search-input', 'ccc');
    await page.waitForTimeout(2000);
    const searchResultCount2 = await page.locator('#search-result li').count();
    expect(searchResultCount2).toBe(0);
    expect ( await page.locator('.empty-hint').innerText()).toBe('未查询到关键字"ccc"相关数据') ;
  })
  test ('should highlight keywords in search result', async ({ page }) => {
    await page.fill('#search-input', 'a');
    await page.waitForTimeout(2000);
    // 获取高亮内容
    const highlightWords = await page.$$eval('#search-result .highlight-word', elements => {
      return elements.map(element => element.textContent);
    });
    console.log(highlightWords);
    // 验证高亮内容数量
    expect(highlightWords.length).toBe(8);
    // 验证高亮内容是否符合预期
    expect(highlightWords).toEqual([
      'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a'
    ]);
  })
  test ('should show error hint when search failed', async ({page}) => {
    await page.route('**/api/query*', route => {
      route.abort();
    })
    await page.fill('#search-input', 'a');
    await page.waitForTimeout(2000);
    expect(await page.locator('.error-hint').count()).toBe(1);
  })
  test('should show error hint when search request timeout', async ({page}) => {
    test.setTimeout(65000);
    await page.fill('#search-input', 'lla');
    await page.waitForTimeout(62000);
    expect(await page.locator('.error-hint').count()).toBe(1);
  })
  test('simulate multiple search requests', async ({page}) => {
    const keywords = ['a', 'b', 'c', 'k', 'd', 'e', 'nnn', '666', '8888', '99898', 'n', 'bo', 'o', '赵斌'];
    await page.route('**/api/query*', route => {
      console.log(route.request().url(), keywords.length);
      if (route.request().url().includes('keyword=666')) {
        route.abort();
      } else {
        route.continue();
      }
    })
    for (const keyword of keywords) {
      await page.fill('#search-input', keyword);
      await page.waitForTimeout(2000);
    }
    const searchResultCount = await page.locator('#search-result li').count();
    expect(searchResultCount).toBe(1);
  })
  test('simulating concurrent search requests', async ({page}) => {
    const keywords = ['a', 'b', 'c', 'k', 'd', 'e', 'nnn', '666', '8888', '99898', 'n', 'bo', 'o', '赵斌', 'go', 'a'];
    test.setTimeout(2000 * keywords.length);
    for (let i = 0; i < keywords.length; i++ ) {
      console.log('查询第==>', i,keywords[i], keywords.length);
      await page.fill('#search-input', keywords[i]);
      await page.waitForTimeout(60);
    }
    await page.waitForTimeout(1500 * keywords.length);
    const searchResultCount = await page.locator('#search-result li').count();
    expect(searchResultCount).toBe(7);
  })
  test ('when responses are not in order, display the latest search results', async({ page }) => {

    await page.route('**/api/query*', async ( route) => {
      const url = route.request().url();
      if (url.includes('keyword=b')) {
        setTimeout(async () => {
          const response = await route.fetch();
          const body = await response.text();
        await  route.fulfill({
            response,
            body,
            headers: {
              ...response.headers(),
            }
          });
        }, 1800);
      } else if (url.includes('keyword=c')) {
        const response = await route.fetch();
        const body = await response.text();
        setTimeout(async () => {
          await  route.fulfill({
            response,
            body,
            headers: {
              ...response.headers(),
            }
          });
        }, 2000)
      } else {

        const response = await route.fetch();
        const body = await response.text();
        await route.fulfill({
          response,
          body,
          headers: {
            ...response.headers(),
          }
        });
      }
    })
    const keywords = ['a', 'b', 'c', 'k'];
    for (let index = 0; index < keywords.length; index++) {
      await page.fill('#search-input', keywords[index]);
      await page.waitForTimeout(60);
    }

    await page.waitForTimeout(5000 * keywords.length);
    const searchResultCount = await page.locator('#search-result li').count();
    expect(searchResultCount).toBe(1);
  })
})
