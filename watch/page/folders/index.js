import { createWidget, widget, align, deleteWidget } from "@zos/ui";
import { push } from "@zos/router";
import { BasePage } from "@zeppos/zml/base-page";
import { COLORS } from "../shared/colors";
import { SCREEN, CONTENT } from "../shared/layout";
import { buildList } from "../shared/list-builder";
import { showError, showOfflineIndicator, createLoadingWidget } from "../shared/ui-helpers";
import { MSG } from "../../lib/communication";
import { fetchWithCache } from "../../lib/fetch-with-cache";
import { keepAlive } from "../../lib/session";

Page(
  BasePage({
    state: { path: "", items: [], offline: false },

    onInit(params) {
      keepAlive();
      if (params) {
        try { this.state.path = JSON.parse(params).path || ""; }
        catch (e) { this.state.path = ""; }
      }
    },

    build() {
      let title = this.state.path || "Pastas";
      if (title.length > 25) title = "..." + title.slice(-22);

      createWidget(widget.TEXT, {
        x: CONTENT.MARGIN_X, y: CONTENT.MARGIN_TOP,
        w: CONTENT.WIDTH, h: 36,
        text: title, text_size: 22,
        color: COLORS.ACCENT_H2, align_h: align.CENTER_H,
      });

      this.loadingWidget = createLoadingWidget();
      const self = this;
      const method = this.state.path ? MSG.GET_FOLDER : MSG.GET_ROOT_FOLDERS;
      const params = this.state.path ? { path: this.state.path } : {};

      fetchWithCache(
        this, method, params,
        (result, isOffline) => {
          self.state.offline = isOffline;
          self.state.items = result.items || [];
          self.renderList();
        },
        (err) => showError(self.loadingWidget, err)
      );
    },

    renderList() {
      deleteWidget(this.loadingWidget);
      const allItems = this.state.items;

      if (this.state.offline) showOfflineIndicator();

      if (allItems.length === 0) {
        createWidget(widget.TEXT, {
          x: CONTENT.MARGIN_X, y: SCREEN.CENTER_Y - 20,
          w: CONTENT.WIDTH, h: 40,
          text: "Pasta vazia", text_size: 16,
          color: COLORS.TEXT_DIM, align_h: align.CENTER_H,
        });
        return;
      }

      const listY = CONTENT.MARGIN_TOP + (this.state.offline ? 60 : 50);
      const items = allItems.map((item) => ({
        title: item.name,
        subtitle: item.type === "folder" ? item.note_count + " notas" : item.path,
      }));

      buildList(listY, SCREEN.HEIGHT - listY - 10, items, (index) => {
        const item = allItems[index];
        if (item.type === "folder") {
          push({ url: "page/folders/index", params: JSON.stringify({ path: item.path }) });
        } else {
          push({ url: "page/note-view/index", params: JSON.stringify({ path: item.path, title: item.name }) });
        }
      });
    },
  })
);
