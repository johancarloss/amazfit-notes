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
    state: { folder: "", notes: [], offline: false },

    onInit(params) {
      if (params) {
        try { this.state.folder = JSON.parse(params).folder || ""; }
        catch (e) { this.state.folder = ""; }
      }
    },

    build() {
      var title = this.state.folder.split("/").pop() || "Notas";

      createWidget(widget.TEXT, {
        x: CONTENT.MARGIN_X, y: CONTENT.MARGIN_TOP,
        w: CONTENT.WIDTH, h: 36,
        text: title, text_size: 22,
        color: COLORS.ACCENT_H2, align_h: align.CENTER_H,
      });

      this.loadingWidget = createWidget(widget.TEXT, {
        x: CONTENT.MARGIN_X, y: SCREEN.CENTER_Y - 20,
        w: CONTENT.WIDTH, h: 40,
        text: "Carregando...", text_size: 18,
        color: COLORS.LOADING, align_h: align.CENTER_H,
      });

      var self = this;
      fetchWithCache(
        this, MSG.GET_FOLDER, { path: this.state.folder },
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
          text: "Nenhuma nota", text_size: 16,
          color: COLORS.TEXT_DIM, align_h: align.CENTER_H,
        });
        return;
      }

      var listY = CONTENT.MARGIN_TOP + (this.state.offline ? 60 : 50);
      var items = notes.map(function (n) {
        return { title: n.name, subtitle: n.modified || "" };
      });

      buildList(listY, SCREEN.HEIGHT - listY - 10, items, function (index) {
        var note = notes[index];
        push({ url: "page/note-view/index", params: JSON.stringify({ path: note.path, title: note.name }) });
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
