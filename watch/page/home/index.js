import { createWidget, widget, text_style, align, deleteWidget } from "@zos/ui";
import { push } from "@zos/router";
import { BasePage } from "@zeppos/zml/base-page";
import { COLORS } from "../shared/colors";
import { SCREEN, CONTENT } from "../shared/layout";
import { buildList } from "../shared/list-builder";
import { MSG } from "../../lib/communication";
import { fetchWithCache } from "../../lib/fetch-with-cache";

Page(
  BasePage({
    state: { notes: [], offline: false },

    build() {
      createWidget(widget.TEXT, {
        x: CONTENT.MARGIN_X, y: CONTENT.MARGIN_TOP,
        w: CONTENT.WIDTH, h: 36,
        text: "Amazfit Notes", text_size: 24,
        color: COLORS.ACCENT_H1, align_h: align.CENTER_H,
      });

      this.loadingWidget = createWidget(widget.TEXT, {
        x: CONTENT.MARGIN_X, y: SCREEN.CENTER_Y - 20,
        w: CONTENT.WIDTH, h: 40,
        text: "Carregando...", text_size: 18,
        color: COLORS.LOADING, align_h: align.CENTER_H,
      });

      var self = this;
      fetchWithCache(
        this, MSG.GET_WATCH_NOTES, {},
        function (result, isOffline) {
          self.state.offline = isOffline;
          self.state.notes = (result.items || []).filter(function (i) {
            return i.type === "note";
          });
          self.renderList();
        },
        function (err) { self.showError(err); }
      );
    },

    renderList() {
      deleteWidget(this.loadingWidget);
      var notes = this.state.notes;

      // Offline indicator
      if (this.state.offline) {
        createWidget(widget.TEXT, {
          x: CONTENT.MARGIN_X, y: CONTENT.MARGIN_TOP + 36,
          w: CONTENT.WIDTH, h: 20,
          text: "Offline — cache local", text_size: 12,
          color: COLORS.TEXT_DIM, align_h: align.CENTER_H,
        });
      }

      if (notes.length === 0) {
        createWidget(widget.TEXT, {
          x: CONTENT.MARGIN_X, y: SCREEN.CENTER_Y - 20,
          w: CONTENT.WIDTH, h: 40,
          text: "Pasta Watch/ vazia", text_size: 16,
          color: COLORS.TEXT_DIM, align_h: align.CENTER_H,
        });
        return;
      }

      var listY = CONTENT.MARGIN_TOP + (this.state.offline ? 60 : 50);
      var listH = SCREEN.HEIGHT - listY - 70;

      var items = notes.map(function (n) {
        return { title: n.name, subtitle: n.path };
      });

      buildList(listY, listH, items, function (index) {
        var note = notes[index];
        push({
          url: "page/note-view/index",
          params: JSON.stringify({ path: note.path, title: note.name }),
        });
      });

      createWidget(widget.BUTTON, {
        x: SCREEN.CENTER_X - 100, y: SCREEN.HEIGHT - 62,
        w: 200, h: 38,
        normal_color: COLORS.BG_CARD, press_color: 0x333333,
        radius: 19,
        text: "Todas as Pastas", text_size: 15, color: COLORS.TEXT_SECONDARY,
        click_func: function () {
          push({ url: "page/folders/index", params: "" });
        },
      });
    },

    showError(error) {
      deleteWidget(this.loadingWidget);
      createWidget(widget.TEXT, {
        x: CONTENT.MARGIN_X, y: SCREEN.CENTER_Y - 30,
        w: CONTENT.WIDTH, h: 60,
        text: "Erro: " + String(error), text_size: 16,
        color: 0xff5252, align_h: align.CENTER_H, text_style: text_style.WRAP,
      });
    },
  })
);
