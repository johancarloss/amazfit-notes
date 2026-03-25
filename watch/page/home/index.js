import { createWidget, widget, align, deleteWidget } from "@zos/ui";
import { push, replace } from "@zos/router";
import { BasePage } from "@zeppos/zml/base-page";
import { COLORS } from "../shared/colors";
import { SCREEN, CONTENT } from "../shared/layout";
import { buildList } from "../shared/list-builder";
import { showError, showOfflineIndicator, createLoadingWidget } from "../shared/ui-helpers";
import { MSG } from "../../lib/communication";
import { fetchWithCache } from "../../lib/fetch-with-cache";
import { keepAlive, getSession, clearSession, saveSession } from "../../lib/session";

Page(
  BasePage({
    state: { notes: [], offline: false },

    build() {
      keepAlive();
      clearSession(); // Home = no session to restore

      // Check if there's a saved session (user was reading a note)
      const session = getSession();
      if (session && session.url) {
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
          text: "Pasta Watch/ vazia", text_size: 16,
          color: COLORS.TEXT_DIM, align_h: align.CENTER_H,
        });
        return;
      }

      const listY = CONTENT.MARGIN_TOP + (this.state.offline ? 60 : 50);
      const listH = SCREEN.HEIGHT - listY - 70;
      const items = notes.map((n) => ({ title: n.name, subtitle: n.path }));

      buildList(listY, listH, items, (index) => {
        const note = notes[index];
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
        click_func: () => push({ url: "page/folders/index", params: "" }),
      });
    },
  })
);
