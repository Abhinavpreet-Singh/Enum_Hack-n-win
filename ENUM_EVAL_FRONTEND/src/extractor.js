/**
 * DOM and CSS Extractor Module
 * Responsible for traversing DOM, extracting structured data, and computed styles
 */

/**
 * Extract structured DOM tree from page
 * @param {Page} page - Playwright page object
 * @returns {Promise<Array>} Array of element objects with DOM structure
 */
export async function extractDomStructure(page) {
  const domTree = await page.evaluate(() => {
    const elements = [];
    let elementId = 0;

    function traverse(node, depth = 0, parentId = null) {
      // Only process element nodes
      if (node.nodeType !== 1) return;

      const currentId = elementId++;
      const rect = node.getBoundingClientRect();

      // Check if element is visible (has dimensions and not hidden)
      const isVisible = rect.width > 0 && rect.height > 0;

      if (!isVisible) return;

      const element = {
        id: currentId,
        parentId: parentId,
        tagName: node.tagName.toLowerCase(),
        elementId: node.id || null,
        classList: Array.from(node.classList),
        textContent: node.textContent.trim().substring(0, 500), // Limit length
        childCount: node.children.length,
        depth: depth,
        childIds: [],
      };

      const currentIndex = elements.length;
      elements.push(element);

      // Traverse children
      for (let child of node.children) {
        const childRect = child.getBoundingClientRect();
        if (childRect.width > 0 && childRect.height > 0) {
          const childStartLength = elements.length;
          traverse(child, depth + 1, currentId);
          // Collect child IDs that were added
          for (let i = childStartLength; i < elements.length; i++) {
            if (elements[i].parentId === currentId) {
              elements[currentIndex].childIds.push(elements[i].id);
            }
          }
        }
      }
    }

    traverse(document.documentElement);
    return elements;
  });

  return domTree;
}

/**
 * Extract computed CSS styles for all visible elements
 * @param {Page} page - Playwright page object
 * @param {Array} domElements - Array of elements from extractDomStructure
 * @returns {Promise<Object>} Map of element ID to computed styles
 */
export async function extractComputedStyles(page, domElements) {
  const styles = await page.evaluate((elementCount) => {
    const styleMap = {};
    let processedCount = 0;

    // We'll process elements by evaluating them directly
    const allElements = document.querySelectorAll('*');
    
    allElements.forEach((el, index) => {
      const rect = el.getBoundingClientRect();
      // Only process visible elements
      if (rect.width <= 0 || rect.height <= 0) return;

      const computed = window.getComputedStyle(el);

      // Parse color string to RGB
      const parseColor = (colorStr) => {
        if (!colorStr || colorStr === 'transparent') {
          return { r: 0, g: 0, b: 0, a: 0 };
        }
        // Handle rgb/rgba
        const match = colorStr.match(
          /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/
        );
        if (match) {
          return {
            r: parseInt(match[1]),
            g: parseInt(match[2]),
            b: parseInt(match[3]),
            a: match[4] ? parseFloat(match[4]) : 1,
          };
        }
        return { r: 0, g: 0, b: 0, a: 1 };
      };

      // Parse margin/padding values
      const parseBox = (top, right, bottom, left) => {
        return {
          top: parseFloat(top),
          right: parseFloat(right),
          bottom: parseFloat(bottom),
          left: parseFloat(left),
        };
      };

      styleMap[index] = {
        fontSize: parseFloat(computed.fontSize),
        fontWeight: computed.fontWeight,
        color: parseColor(computed.color),
        backgroundColor: parseColor(computed.backgroundColor),
        margin: parseBox(
          computed.marginTop,
          computed.marginRight,
          computed.marginBottom,
          computed.marginLeft
        ),
        padding: parseBox(
          computed.paddingTop,
          computed.paddingRight,
          computed.paddingBottom,
          computed.paddingLeft
        ),
        display: computed.display,
        position: computed.position,
        width: parseFloat(computed.width),
        height: parseFloat(computed.height),
        borderRadius: computed.borderRadius,
        textAlign: computed.textAlign,
      };
      processedCount++;
    });

    return styleMap;
  }, domElements.length);

  return styles;
}

/**
 * Extract layout geometry for all visible elements
 * @param {Page} page - Playwright page object
 * @returns {Promise<Object>} Map of element index to layout geometry
 */
export async function extractLayoutGeometry(page) {
  const geometry = await page.evaluate(() => {
    const geometryMap = {};
    const allElements = document.querySelectorAll('*');

    allElements.forEach((el, index) => {
      const rect = el.getBoundingClientRect();
      
      // Only record visible elements
      if (rect.width > 0 && rect.height > 0) {
        geometryMap[index] = {
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        };
      }
    });

    return geometryMap;
  });

  return geometry;
}

/**
 * Prepare page for consistent rendering
 * Handles both static HTML and React/Vue/Angular SPA applications
 * @param {Page} page - Playwright page object
 */
export async function preparePageForExtraction(page) {
  // Disable animations and transitions
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation: none !important;
        transition: none !important;
      }
    `,
  });

  // Wait for network idle to ensure all resources loaded
  try {
    await page.waitForLoadState('networkidle', { timeout: 30000 });
  } catch (e) {
    // Continue even if networkidle times out
    console.warn('Network idle timeout, proceeding with extraction');
  }

  // Wait for React/Vue/Angular or other SPA frameworks to finish rendering
  // Monitors DOM mutations to detect when framework has finished rendering
  try {
    await page.evaluate(() => {
      return new Promise((resolve) => {
        let mutationCount = 0;
        const observer = new MutationObserver(() => {
          mutationCount++;
        });

        // Start observing DOM changes
        observer.observe(document.documentElement, {
          childList: true,
          subtree: true,
          attributes: true,
          characterData: false,
        });

        // Check if mutations have stopped
        const checkInterval = setInterval(() => {
          if (mutationCount === 0) {
            // No mutations in last 100ms, framework likely done rendering
            clearInterval(checkInterval);
            observer.disconnect();
            resolve();
          }
          mutationCount = 0;
        }, 100);

        // Timeout after 5 seconds to avoid waiting forever
        setTimeout(() => {
          clearInterval(checkInterval);
          observer.disconnect();
          resolve();
        }, 5000);
      });
    });
  } catch (e) {
    // Continue if mutation detection fails
  }

  // Wait for CSS and layouts to fully apply
  await page.waitForTimeout(500);
}
