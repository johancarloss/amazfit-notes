import { createWidget, widget, deleteWidget, align } from "@zos/ui";
import { BasePage } from "@zeppos/zml/base-page";
import { COLORS } from "../shared/colors";
import { SCREEN, CONTENT } from "../shared/layout";
import { renderMarkdownBlocks } from "../shared/markdown-renderer";
import { showError, createLoadingWidget } from "../shared/ui-helpers";
import { MSG } from "../../lib/communication";
import { fetchWithCache } from "../../lib/fetch-with-cache";
import { keepAlive, saveSession, clearSession } from "../../lib/session";

Page(
  BasePage({
    state: { path: "", title: "", blocks: [], offline: false },

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

      // Save session so app restores to this note after screen off
      saveSession("page/note-view/index", JSON.stringify({
        path: this.state.path,
        title: this.state.title,
      }));

      this.loadingWidget = createLoadingWidget("Carregando nota...");
      const self = this;

      fetchWithCache(
        this, MSG.GET_NOTE_BLOCKS,
        { path: this.state.path, max_blocks: 150 },
        (result, isOffline) => {
          self.state.offline = isOffline;
          self.state.blocks = result.blocks || [];
          self.renderNote();
        },
        (err) => showError(self.loadingWidget, err)
      );
    },

    renderNote() {
      deleteWidget(this.loadingWidget);

      if (this.state.blocks.length === 0) {
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

      if (this.state.offline) {
        container.createWidget(widget.TEXT, {
          x: CONTENT.MARGIN_X, y: 10,
          w: CONTENT.WIDTH, h: 20,
          text: "Offline \u2014 cache local", text_size: 12,
          color: COLORS.TEXT_DIM, align_h: align.CENTER_H,
        });
      }

      renderMarkdownBlocks(container, this.state.blocks, CONTENT.WIDTH);
      createWidget(widget.PAGE_SCROLLBAR, {});
    },

    onDestroy() {
      // Clear session when user manually exits (back button)
      clearSession();
    },
  })
);
