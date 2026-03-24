import { createWidget, widget, text_style, align, deleteWidget } from "@zos/ui";
import { BasePage } from "@zeppos/zml/base-page";
import { COLORS } from "../shared/colors";
import { SCREEN, CONTENT } from "../shared/layout";
import { renderMarkdownBlocks } from "../shared/markdown-renderer";
import { MSG } from "../../lib/communication";
import { fetchWithCache } from "../../lib/fetch-with-cache";

Page(
  BasePage({
    state: { path: "", title: "", blocks: [], offline: false },

    onInit(params) {
      if (params) {
        try {
          var parsed = JSON.parse(params);
          this.state.path = parsed.path || "";
          this.state.title = parsed.title || "";
        } catch (e) {
          // ignore
        }
      }
    },

    build() {
      this.loadingWidget = createWidget(widget.TEXT, {
        x: CONTENT.MARGIN_X, y: SCREEN.CENTER_Y - 30,
        w: CONTENT.WIDTH, h: 60,
        text: "Carregando nota...", text_size: 18,
        color: COLORS.LOADING, align_h: align.CENTER_H,
        text_style: text_style.WRAP,
      });

      var self = this;
      fetchWithCache(
        this, MSG.GET_NOTE_BLOCKS,
        { path: this.state.path, max_blocks: 150 },
        function (result, isOffline) {
          self.state.offline = isOffline;
          self.state.blocks = result.blocks || [];
          self.renderNote();
        },
        function (err) { self.showError(err); }
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

      var container = createWidget(widget.VIEW_CONTAINER, {
        x: 0, y: 0,
        w: SCREEN.WIDTH, h: SCREEN.HEIGHT,
        scroll_enable: true,
        z_index: 0,
      });

      // Offline indicator at top of note
      if (this.state.offline) {
        container.createWidget(widget.TEXT, {
          x: CONTENT.MARGIN_X, y: 10,
          w: CONTENT.WIDTH, h: 20,
          text: "Offline — cache local", text_size: 12,
          color: COLORS.TEXT_DIM, align_h: align.CENTER_H,
        });
      }

      renderMarkdownBlocks(container, this.state.blocks, CONTENT.WIDTH);

      createWidget(widget.PAGE_SCROLLBAR, {});
    },

    showError(error) {
      deleteWidget(this.loadingWidget);
      createWidget(widget.TEXT, {
        x: CONTENT.MARGIN_X, y: SCREEN.CENTER_Y - 30,
        w: CONTENT.WIDTH, h: 60,
        text: "Erro: " + String(error),
        text_size: 16, color: 0xff5252,
        align_h: align.CENTER_H, text_style: text_style.WRAP,
      });
    },
  })
);
