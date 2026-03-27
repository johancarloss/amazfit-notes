import { createWidget, widget, align, deleteWidget } from "@zos/ui";
import { push, replace } from "@zos/router";
import { BasePage } from "@zeppos/zml/base-page";
import { COLORS } from "../shared/colors";
import { SCREEN, CONTENT } from "../shared/layout";
import { buildList } from "../shared/list-builder";
import { showError, showOfflineIndicator, createLoadingWidget } from "../shared/ui-helpers";
import { MSG } from "../../lib/communication";
import { fetchWithCache } from "../../lib/fetch-with-cache";
import { keepAlive, getSession, clearSession } from "../../lib/session";

Page(
  BasePage({
    state: { items: [], offline: false },

    build() {
      keepAlive();

      // Restore session if user was reading a note
      const session = getSession();
      if (session && session.url) {
        clearSession();
        replace({ url: session.url, params: session.params || "" });
        return;
      }

      createWidget(widget.TEXT, {
        x: CONTENT.MARGIN_X, y: CONTENT.MARGIN_TOP,
        w: CONTENT.WIDTH, h: 36,
        text: "Amazfit Notes", text_size: 24,
        color: COLORS.ACCENT_H1, align_h: align.CENTER_H,
      });

      this.loadingWidget = createLoadingWidget();
      const self = this;

      fetchWithCache(
        this, MSG.GET_WATCH_NOTES, {},
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
          text: "Pasta Watch/ vazia", text_size: 16,
          color: COLORS.TEXT_DIM, align_h: align.CENTER_H,
        });
        return;
      }

      const listY = CONTENT.MARGIN_TOP + (this.state.offline ? 60 : 50);
      const listH = SCREEN.HEIGHT - listY - 10;

      const items = allItems.map((item) => ({
        title: item.name,
        subtitle: item.type === "folder"
          ? item.note_count + " notas"
          : item.path,
      }));

      buildList(listY, listH, items, (index) => {
        const item = allItems[index];
        if (item.type === "folder") {
          push({
            url: "page/folders/index",
            params: JSON.stringify({ path: item.path }),
          });
        } else {
          push({
            url: "page/note-view/index",
            params: JSON.stringify({ path: item.path, title: item.name }),
          });
        }
      });
    },
  })
);
