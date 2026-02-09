/**
 * UI Module - Component Factory & DOM Helpers
 * Feature-centric, vanilla JS, accessible components
 * Follows Design Canon specification
 */

export const UI = {
  createElement,
  render,
  bindEvents,
  setLoading,
  announce
};

/**
 * Create a DOM element with attributes and children
 * @param {string} tag - HTML tag name
 * @param {Object} options - Element options
 * @returns {HTMLElement}
 */
export function createElement(tag, options = {}) {
  const {
    className = '',
    id = '',
    textContent = '',
    innerHTML = '',
    attributes = {},
    dataset = {},
    children = [],
    events = {}
  } = options;

  const element = document.createElement(tag);

  if (className) element.className = className;
  if (id) element.id = id;
  if (textContent) element.textContent = textContent;
  if (innerHTML) element.innerHTML = innerHTML;

  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });

  Object.entries(dataset).forEach(([key, value]) => {
    element.dataset[key] = value;
  });

  children.forEach(child => {
    if (typeof child === 'string') {
      element.appendChild(document.createTextNode(child));
    } else if (child instanceof Node) {
      element.appendChild(child);
    }
  });

  Object.entries(events).forEach(([event, handler]) => {
    element.addEventListener(event, handler);
  });

  return element;
}

/**
 * Render a component to a container
 * @param {HTMLElement} container - Parent element
 * @param {HTMLElement|string} content - Content to render
 * @returns {void}
 */
export function render(container, content) {
  if (!container) {
    logEvent('ERROR', 'ui-render', { error: 'Container not found' });
    return;
  }
  
  if (typeof content === 'string') {
    container.innerHTML = content;
  } else if (content instanceof Node) {
    container.innerHTML = '';
    container.appendChild(content);
  }
}

/**
 * Bind multiple event listeners efficiently
 * @param {Array<{element: HTMLElement, event: string, handler: Function}>} bindings
 * @returns {Function} Cleanup function
 */
export function bindEvents(bindings) {
  bindings.forEach(({ element, event, handler }) => {
    element.addEventListener(event, handler);
  });

  return () => {
    bindings.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
  };
}

/**
 * Set loading state on a container
 * @param {HTMLElement} container - Element to show loader
 * @param {boolean} isLoading - Loading state
 * @param {string} message - Loading message
 */
export function setLoading(container, isLoading, message = 'Loading...') {
  if (!container) return;

  const existingLoader = container.querySelector('.ui-loader');

  if (isLoading) {
    if (existingLoader) return;

    const loader = createElement('div', {
      className: 'ui-loader',
      innerHTML: `
        <div class="ui-loader__spinner"></div>
        <p class="ui-loader__message">${message}</p>
      `
    });

    container.appendChild(loader);
  } else {
    if (existingLoader) {
      existingLoader.remove();
    }
  }
}

/**
 * Announce message to screen readers
 * @param {string} message
 */
export function announce(message) {
  const announcer = document.getElementById('sr-announcer');
  if (announcer) {
    announcer.textContent = message;
    setTimeout(() => {
      announcer.textContent = '';
    }, 3000);
  }
}

/**
 * Focus management for modals/dialogs
 * @param {HTMLElement} element - Element to focus
 */
export function focusElement(element) {
  if (element) {
    element.focus();
  }
}

/**
 * Trap focus within a container (for modals)
 * @param {HTMLElement} container - Container element
 * @param {HTMLElement} initialFocus - Element to focus first
 */
export function trapFocus(container, initialFocus) {
  const focusableSelectors = [
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'a[href]',
    '[tabindex]:not([tabindex="-1"])'
  ].join(', ');

  const focusableElements = container.querySelectorAll(focusableSelectors);
  const firstFocusable = initialFocus || focusableElements[0];
  const lastFocusable = focusableElements[focusableElements.length - 1];

  firstFocusable?.focus();

  container.addEventListener('keydown', function handleKeydown(e) {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) {
      if (document.activeElement === firstFocusable) {
        e.preventDefault();
        lastFocusable?.focus();
      }
    } else {
      if (document.activeElement === lastFocusable) {
        e.preventDefault();
        firstFocusable?.focus();
      }
    }
  });

  return () => {
    container.removeEventListener('keydown', handleKeydown);
  };
}

/**
 * Generate unique IDs for ARIA relationships
 * @returns {string}
 */
export function generateAriaId() {
  return `aria-${Math.random().toString(36).substring(2, 9)}`;
}

const logEvent = (level, context, data) => {
  const entry = {
    level,
    timestamp: Date.now(),
    correlationId: generateId(),
    context,
    data
  };
  console.log(JSON.stringify(entry));
};

const generateId = () => {
  return Math.random().toString(36).substring(2, 15);
};
