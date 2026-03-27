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
      totalBlocks: 0,
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
      this.fetchPage(0);
    },

    fetchPage(pageNumber) {
      const self = this;
      const offset = pageNumber * BLOCKS_PER_PAGE;

      fetchWithCache(
        this, MSG.GET_NOTE_BLOCKS,
        { path: this.state.path, offset: offset, limit: BLOCKS_PER_PAGE },
        (result, isOffline) => {
          self.state.offline = isOffline;
          self.state.blocks = result.blocks || [];
          self.state.totalBlocks = result.total_blocks || result.block_count || 0;
          self.state.totalPages = Math.ceil(self.state.totalBlocks / BLOCKS_PER_PAGE);
          self.state.currentPage = pageNumber;
          self.renderPage();
        },
        (err) => showError(self.loadingWidget, err)
      );
    },

    renderPage() {
      if (this.loadingWidget) {
        deleteWidget(this.loadingWidget);
        this.loadingWidget = null;
      }
      if (this.state.container) {
        deleteWidget(this.state.container);
        this.state.container = null;
      }

      const blocks = this.state.blocks;
      const page = this.state.currentPage;
      const totalPages = this.state.totalPages;
      const self = this;

      if (blocks.length === 0 && page === 0) {
        createWidget(widget.TEXT, {
          x: CONTENT.MARGIN_X, y: SCREEN.CENTER_Y - 20,
          w: CONTENT.WIDTH, h: 40,
          text: "Nota vazia", text_size: 16,
          color: COLORS.TEXT_DIM, align_h: align.CENTER_H,
        });
        return;
      }

      const container = createWidget(widget.VIEW_CONTAINER, {
        x: 0, y: 0,
        w: SCREEN.WIDTH, h: SCREEN.HEIGHT,
        scroll_enable: true,
        z_index: 0,
      });
      this.state.container = container;

      // === TOP NAVIGATION BAR ===
      let navY = 15;

      // Page indicator
      const label = "Pag. " + (page + 1) + "/" + totalPages +
        (this.state.offline ? " (offline)" : "");
      container.createWidget(widget.TEXT, {
        x: CONTENT.MARGIN_X, y: navY,
        w: CONTENT.WIDTH, h: 20,
        text: label, text_size: 12,
        color: COLORS.TEXT_DIM, align_h: align.CENTER_H,
      });
      navY += 22;

      // Navigation buttons side by side
      if (totalPages > 1) {
        const btnW = (CONTENT.WIDTH - 16) / 2; // two buttons with gap
        const btnH = 34;

        // Previous button (left)
        if (page > 0) {
          container.createWidget(widget.BUTTON, {
            x: CONTENT.MARGIN_X, y: navY,
            w: btnW, h: btnH,
            normal_color: COLORS.BG_CARD, press_color: 0x333333,
            radius: 17,
            text: "\u25C0 Anterior", text_size: 13, color: COLORS.TEXT_SECONDARY,
            click_func: () => {
              self.loadingWidget = createLoadingWidget("Carregando...");
              self.fetchPage(self.state.currentPage - 1);
            },
          });
        }

        // Next button (right)
        if (page < totalPages - 1) {
          container.createWidget(widget.BUTTON, {
            x: CONTENT.MARGIN_X + btnW + 16, y: navY,
            w: btnW, h: btnH,
            normal_color: COLORS.BG_CARD, press_color: 0x333333,
            radius: 17,
            text: "Proxima \u25B6", text_size: 13, color: COLORS.ACCENT_H2,
            click_func: () => {
              self.loadingWidget = createLoadingWidget("Carregando...");
              self.fetchPage(self.state.currentPage + 1);
            },
          });
        }

        navY += btnH + 6;
      }

      // === CONTENT ===
      const extraTop = navY - CONTENT.MARGIN_TOP;
      const totalHeight = renderMarkdownBlocks(container, blocks, CONTENT.WIDTH, extraTop);

      // === BOTTOM NAVIGATION (repeat for long pages) ===
      if (totalPages > 1) {
        const bottomY = totalHeight + 10;
        const btnW = (CONTENT.WIDTH - 16) / 2;
        const btnH = 38;

        if (page > 0) {
          container.createWidget(widget.BUTTON, {
            x: CONTENT.MARGIN_X, y: bottomY,
            w: btnW, h: btnH,
            normal_color: COLORS.BG_CARD, press_color: 0x333333,
            radius: 19,
            text: "\u25C0 Anterior", text_size: 14, color: COLORS.TEXT_SECONDARY,
            click_func: () => {
              self.loadingWidget = createLoadingWidget("Carregando...");
              self.fetchPage(self.state.currentPage - 1);
            },
          });
        }

        if (page < totalPages - 1) {
          container.createWidget(widget.BUTTON, {
            x: CONTENT.MARGIN_X + btnW + 16, y: bottomY,
            w: btnW, h: btnH,
            normal_color: COLORS.BG_CARD, press_color: 0x333333,
            radius: 19,
            text: "Proxima \u25B6", text_size: 14, color: COLORS.ACCENT_H2,
            click_func: () => {
              self.loadingWidget = createLoadingWidget("Carregando...");
              self.fetchPage(self.state.currentPage + 1);
            },
          });
        }
      }

      try { scrollTo({ y: 0 }); } catch (e) { /* ignore */ }
      createWidget(widget.PAGE_SCROLLBAR, {});
    },

    onDestroy() {
      clearSession();
    },
  })
);
