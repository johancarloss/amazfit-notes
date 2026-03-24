import { createWidget, widget, text_style } from "@zos/ui";
import { COLORS } from "./colors";
import { SCREEN, CONTENT } from "./layout";

/**
 * Build a scrollable list of tappable items using VIEW_CONTAINER.
 *
 * @param {number} startY - Y position to start the list
 * @param {number} height - Available height for the list
 * @param {Array} items - Array of { title, subtitle }
 * @param {function} onTap - function(index) called when item is tapped
 */
export function buildList(startY, height, items, onTap) {
  const container = createWidget(widget.VIEW_CONTAINER, {
    x: 0, y: startY,
    w: SCREEN.WIDTH, h: height,
    scroll_enable: true,
    z_index: 0,
  });

  const itemH = CONTENT.LIST_ITEM_HEIGHT;
  const gap = CONTENT.LIST_ITEM_GAP;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const y = i * (itemH + gap);

    // Tappable button as the full item background
    ((index) => {
      container.createWidget(widget.BUTTON, {
        x: CONTENT.MARGIN_X, y: y,
        w: CONTENT.WIDTH, h: itemH,
        normal_color: COLORS.LIST_ITEM_BG,
        press_color: 0x333333,
        radius: 12,
        text: "",
        click_func: () => onTap(index),
      });
    })(i);

    container.createWidget(widget.TEXT, {
      x: CONTENT.MARGIN_X + 16, y: y + 12,
      w: CONTENT.WIDTH - 32, h: 26,
      text: item.title || "",
      text_size: 18,
      color: COLORS.TEXT_PRIMARY,
      text_style: text_style.ELLIPSIS,
    });

    if (item.subtitle) {
      container.createWidget(widget.TEXT, {
        x: CONTENT.MARGIN_X + 16, y: y + 42,
        w: CONTENT.WIDTH - 32, h: 20,
        text: item.subtitle,
        text_size: 13,
        color: COLORS.TEXT_DIM,
        text_style: text_style.ELLIPSIS,
      });
    }
  }

  // Bottom spacer for round display
  const totalH = items.length * (itemH + gap) + CONTENT.MARGIN_BOTTOM;
  container.createWidget(widget.FILL_RECT, {
    x: 0, y: totalH - CONTENT.MARGIN_BOTTOM,
    w: 1, h: CONTENT.MARGIN_BOTTOM,
    color: 0x000000, alpha: 0,
  });

  return container;
}
