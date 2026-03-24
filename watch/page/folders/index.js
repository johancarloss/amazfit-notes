import { createWidget, widget, text_style, align, deleteWidget } from "@zos/ui";
import { push } from "@zos/router";
import { BasePage } from "@zeppos/zml/base-page";
import { COLORS } from "../shared/colors";
import { SCREEN, CONTENT } from "../shared/layout";
import { buildList } from "../shared/list-builder";
import { MSG } from "../../lib/communication";

Page(
  BasePage({
    state: { path: "", items: [] },

    onInit(params) {
      if (params) {
        try { this.state.path = JSON.parse(params).path || ""; }
        catch (e) { this.state.path = ""; }
      }
    },

    build() {
      var title = this.state.path || "Pastas";
      if (title.length > 25) title = "..." + title.slice(-22);

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
      var method = this.state.path ? MSG.GET_FOLDER : MSG.GET_ROOT_FOLDERS;
      var params = this.state.path ? { path: this.state.path } : {};

      this.request({ method: method, params: params })
        .then(function (data) {
          var result = data.result || data;
          self.state.items = result.items || [];
          self.renderList();
        })
        .catch(function (err) { self.showError(err); });
    },

    renderList() {
      deleteWidget(this.loadingWidget);
      var allItems = this.state.items;

      if (allItems.length === 0) {
        createWidget(widget.TEXT, {
          x: CONTENT.MARGIN_X, y: SCREEN.CENTER_Y - 20,
          w: CONTENT.WIDTH, h: 40,
          text: "Pasta vazia", text_size: 16,
          color: COLORS.TEXT_DIM, align_h: align.CENTER_H,
        });
        return;
      }

      var listY = CONTENT.MARGIN_TOP + 50;
      var items = allItems.map(function (item) {
        var sub = item.type === "folder"
          ? item.note_count + " notas"
          : item.path;
        return { title: item.name, subtitle: sub };
      });

      buildList(listY, SCREEN.HEIGHT - listY - 10, items, function (index) {
        var item = allItems[index];
        if (item.type === "folder") {
          push({ url: "page/folders/index", params: JSON.stringify({ path: item.path }) });
        } else {
          push({ url: "page/note-view/index", params: JSON.stringify({ path: item.path, title: item.name }) });
        }
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
