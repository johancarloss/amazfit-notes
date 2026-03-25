import { createWidget, widget, deleteWidget, align } from "@zos/ui";
import { scrollTo } from "@zos/page";
import { BasePage } from "@zeppos/zml/base-page";
import { COLORS } from "../shared/colors";
import { SCREEN, CONTENT } from "../shared/layout";
import { renderMarkdownBlocks } from "../shared/markdown-renderer";
import { showError, createLoadingWidget } from "../shared/ui-helpers";
import { MSG } from "../../lib/communication";
import { fetchWithCache } from "../../lib/fetch-with-cache";
import { keepAlive, saveSession, clearSession } from "../../lib/session";

const BLOCKS_PER_PAGE = 25;

Page(
  BasePage({
    state: {
      path: "",
      title: "",
      blocks: [],
      offline: false,
      currentPage: 0,
      totalPages: 0,
      container: null,
    },

    onInit(params) {
      if (params) {
        try {
          const parsed = JSON.parse(params);
          this.state.path = parsed.path || "";
          this.state.title = parsed.title || "";
        } catch (e) {
          // ignore
        }
      }
    },

    build() {
      keepAlive();

      saveSession("page/note-view/index", JSON.stringify({
        path: this.state.path,
        title: this.state.title,
      }));

      this.loadingWidget = createLoadingWidget("Carregando nota...");
      const self = this;

      fetchWithCache(
        this, MSG.GET_NOTE_BLOCKS,
        { path: this.state.path, max_blocks: 500 },
        (result, isOffline) => {
          self.state.offline = isOffline;
          self.state.blocks = result.blocks || [];
          self.state.totalPages = Math.ceil(self.state.blocks.length / BLOCKS_PER_PAGE);
          self.state.currentPage = 0;
          self.renderPage();
        },
        (err) => showError(self.loadingWidget, err)
      );
    },

    renderPage() {
      deleteWidget(this.loadingWidget);

      // Destroy previous container if exists (page change)
      if (this.state.container) {
        deleteWidget(this.state.container);
        this.state.container = null;
      }

      const blocks = this.state.blocks;
      const page = this.state.currentPage;
      const totalPages = this.state.totalPages;

      if (blocks.length === 0) {
        createWidget(widget.TEXT, {
          x: CONTENT.MARGIN_X, y: SCREEN.CENTER_Y - 20,
          w: CONTENT.WIDTH, h: 40,
          text: "Nota vazia", text_size: 16,
          color: COLORS.TEXT_DIM, align_h: align.CENTER_H,
        });
        return;
      }

      // Slice blocks for current page
      const start = page * BLOCKS_PER_PAGE;
      const end = Math.min(start + BLOCKS_PER_PAGE, blocks.length);
      const pageBlocks = blocks.slice(start, end);

      // Create scrollable container
      const container = createWidget(widget.VIEW_CONTAINER, {
        x: 0, y: 0,
        w: SCREEN.WIDTH, h: SCREEN.HEIGHT,
        scroll_enable: true,
        z_index: 0,
      });
      this.state.container = container;

      // Page indicator at top
      const pageLabel = "Pag. " + (page + 1) + "/" + totalPages;
      container.createWidget(widget.TEXT, {
        x: CONTENT.MARGIN_X, y: 15,
        w: CONTENT.WIDTH, h: 20,
        text: this.state.offline ? pageLabel + " (offline)" : pageLabel,
        text_size: 12,
        color: COLORS.TEXT_DIM, align_h: align.CENTER_H,
      });

      // Previous page button (if not first page)
      if (page > 0) {
        const self = this;
        container.createWidget(widget.BUTTON, {
          x: CONTENT.MARGIN_X + 60, y: 32,
          w: CONTENT.WIDTH - 120, h: 34,
          normal_color: COLORS.BG_CARD, press_color: 0x333333,
          radius: 17,
          text: "Pagina anterior", text_size: 14, color: COLORS.TEXT_SECONDARY,
          click_func: () => {
            self.state.currentPage--;
            self.renderPage();
          },
        });
      }

      // Render markdown blocks
      const contentStartY = page > 0 ? 30 : 0; // extra space for "previous" button
      const totalHeight = renderMarkdownBlocks(container, pageBlocks, CONTENT.WIDTH, contentStartY);

      // Next page button (if not last page)
      if (page < totalPages - 1) {
        const self = this;
        const btnY = totalHeight + 10;
        container.createWidget(widget.BUTTON, {
          x: CONTENT.MARGIN_X + 40, y: btnY,
          w: CONTENT.WIDTH - 80, h: 40,
          normal_color: COLORS.BG_CARD, press_color: 0x333333,
          radius: 20,
          text: "Proxima pagina", text_size: 15, color: COLORS.ACCENT_H2,
          click_func: () => {
            self.state.currentPage++;
            self.renderPage();
          },
        });
      }

      // Scroll to top on page change
      try { scrollTo({ y: 0 }); } catch (e) { /* ignore */ }

      createWidget(widget.PAGE_SCROLLBAR, {});
    },

    onDestroy() {
      clearSession();
    },
  })
);
