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
    state: { folder: "", notes: [], offline: false },

    onInit(params) {
      keepAlive();
      if (params) {
        try { this.state.folder = JSON.parse(params).folder || ""; }
        catch (e) { this.state.folder = ""; }
      }
    },

    build() {
      const title = this.state.folder.split("/").pop() || "Notas";

      createWidget(widget.TEXT, {
        x: CONTENT.MARGIN_X, y: CONTENT.MARGIN_TOP,
        w: CONTENT.WIDTH, h: 36,
        text: title, text_size: 22,
        color: COLORS.ACCENT_H2, align_h: align.CENTER_H,
      });

      this.loadingWidget = createLoadingWidget();
      const self = this;

      fetchWithCache(
        this, MSG.GET_FOLDER, { path: this.state.folder },
        (result, isOffline) => {
          self.state.offline = isOffline;
          self.state.notes = (result.items || []).filter((i) => i.type === "note");
          self.renderList();
        },
        (err) => showError(self.loadingWidget, err)
      );
    },

    renderList() {
      deleteWidget(this.loadingWidget);
      const notes = this.state.notes;

      if (this.state.offline) showOfflineIndicator();

      if (notes.length === 0) {
        createWidget(widget.TEXT, {
          x: CONTENT.MARGIN_X, y: SCREEN.CENTER_Y - 20,
          w: CONTENT.WIDTH, h: 40,
          text: "Nenhuma nota", text_size: 16,
          color: COLORS.TEXT_DIM, align_h: align.CENTER_H,
        });
        return;
      }

      const listY = CONTENT.MARGIN_TOP + (this.state.offline ? 60 : 50);
      const items = notes.map((n) => ({ title: n.name, subtitle: n.modified || "" }));

      buildList(listY, SCREEN.HEIGHT - listY - 10, items, (index) => {
        const note = notes[index];
        push({ url: "page/note-view/index", params: JSON.stringify({ path: note.path, title: note.name }) });
      });
    },
  })
);
