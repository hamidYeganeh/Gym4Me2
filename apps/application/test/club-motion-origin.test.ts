import assert from "node:assert/strict";
import test from "node:test";
import {
  rememberClubMotionOrigin,
  withClubMotionOrigin,
} from "../../../packages/ui/src/lib/club-motion-origin";

const exit = "data-zoom-exit-key";
let serial = 0;

class ElementPort {
  readonly attributes = new Map<string, string>();
  readonly children: ElementPort[] = [];
  readonly dataset: { ssgoiTransition?: string } = {};
  parent: ElementPort | null = null;

  constructor(
    readonly tag: string,
    attributes: Record<string, string> = {},
  ) {
    for (const [name, value] of Object.entries(attributes))
      this.attributes.set(name, value);
    this.dataset.ssgoiTransition = attributes["data-ssgoi-transition"];
  }
  append(...children: ElementPort[]) {
    for (const child of children) {
      child.parent = this;
      this.children.push(child);
    }
    return this;
  }
  getAttribute(name: string) {
    return this.attributes.get(name) ?? null;
  }
  setAttribute(name: string, value: string) {
    this.attributes.set(name, value);
  }
  removeAttribute(name: string) {
    this.attributes.delete(name);
  }
  matches(selector: string) {
    if (selector === "article") return this.tag === "article";
    if (selector === "a[href]")
      return this.tag === "a" && this.attributes.has("href");
    return this.attributes.has(selector.slice(1, -1));
  }
  closest(selector: string): ElementPort | null {
    if (this.matches(selector)) return this;
    return this.parent?.closest(selector) ?? null;
  }
  querySelectorAll(selector: string): ElementPort[] {
    return this.children.flatMap((child) => [
      ...(child.matches(selector) ? [child] : []),
      ...child.querySelectorAll(selector),
    ]);
  }
  querySelector(selector: string) {
    return this.querySelectorAll(selector)[0] ?? null;
  }
}

function withPort(check: (port: ReturnType<typeof fixture>) => void) {
  const original = Object.getOwnPropertyDescriptor(globalThis, "Element");
  Object.defineProperty(globalThis, "Element", {
    configurable: true,
    value: ElementPort,
  });
  try {
    check(fixture());
  } finally {
    if (original) Object.defineProperty(globalThis, "Element", original);
    else Reflect.deleteProperty(globalThis, "Element");
  }
}

function fixture() {
  const key = `club-${++serial}`;
  const route = `/qa/club-motion-${serial}`;
  const list = new ElementPort("div", { "data-ssgoi-transition": route });
  const anchors: ElementPort[] = [];
  const links: ElementPort[] = [];
  for (let index = 0; index < 3; index++) {
    const anchor = new ElementPort("div", { [exit]: key });
    const link = new ElementPort("a", { href: `/discovery/clubs/${key}` });
    list.append(new ElementPort("article").append(anchor, link));
    anchors.push(anchor);
    links.push(link);
  }
  const detail = new ElementPort("div").append(
    new ElementPort("div", { "data-zoom-enter-key": key }),
  );
  return { key, route, list, detail, anchors, links };
}
const html = (node: ElementPort) => node as unknown as HTMLElement;
const click = (node: ElementPort) =>
  rememberClubMotionOrigin(node as unknown as EventTarget);

test("the second duplicate card, including a nested keyboard-click target, owns the zoom", () =>
  withPort(({ list, detail, anchors, links, key }) => {
    const label = new ElementPort("span");
    links[1]!.append(label);
    click(label);
    const result = withClubMotionOrigin(html(list), html(detail), false, () => {
      assert.deepEqual(list.querySelectorAll(`[${exit}]`), [anchors[1]]);
      return "selected second card";
    });
    assert.equal(result, "selected second card");
    assert.deepEqual(
      anchors.map((anchor) => anchor.getAttribute(exit)),
      [key, key, key],
    );
  }));

test("a non-anchor opener falls back to push even when the same club has another card", () =>
  withPort(({ list, detail, links }) => {
    click(links[1]!);
    withClubMotionOrigin(html(list), html(detail), false, () => true);
    const featured = new ElementPort("a", {
      href: "/discovery/clubs/featured",
    });
    list.append(new ElementPort("article").append(featured));
    click(featured);
    assert.equal(
      withClubMotionOrigin(html(list), html(detail), false, () =>
        assert.fail(),
      ),
      undefined,
    );
    assert.equal(
      withClubMotionOrigin(html(detail), html(list), true, () => assert.fail()),
      undefined,
    );
  }));

test("Back reuses the selected index in the restored list rather than its first duplicate", () =>
  withPort(({ list, detail, links, route, key }) => {
    click(links[1]!);
    withClubMotionOrigin(html(list), html(detail), false, () => true);
    const restored = new ElementPort("div", { "data-ssgoi-transition": route });
    const anchors = Array.from(
      { length: 3 },
      () => new ElementPort("div", { [exit]: key }),
    );
    restored.append(...anchors);
    const result = withClubMotionOrigin(
      html(detail),
      html(restored),
      true,
      () => {
        assert.deepEqual(restored.querySelectorAll(`[${exit}]`), [anchors[1]]);
        return "returned to second card";
      },
    );
    assert.equal(result, "returned to second card");
    assert.equal(restored.querySelectorAll(`[${exit}]`).length, 3);
  }));

test("a geometry-capture exception restores every protected anchor attribute", () =>
  withPort(({ list, detail, anchors, links, key }) => {
    click(links[1]!);
    assert.throws(
      () =>
        withClubMotionOrigin(html(list), html(detail), false, () => {
          assert.deepEqual(list.querySelectorAll(`[${exit}]`), [anchors[1]]);
          throw new Error("fixture geometry failure");
        }),
      /fixture geometry failure/,
    );
    assert.deepEqual(
      anchors.map((anchor) => anchor.getAttribute(exit)),
      [key, key, key],
    );
  }));

test("a later programmatic forward entry cannot borrow an earlier card click", () =>
  withPort(({ list, detail, links }) => {
    click(links[1]!);
    withClubMotionOrigin(html(list), html(detail), false, () => true);
    assert.equal(
      withClubMotionOrigin(html(list), html(detail), false, () =>
        assert.fail(),
      ),
      undefined,
    );
  }));

for (const kind of ["coach", "class"]) {
  test(`${kind} motion captures a key on the card itself and restores the clicked duplicate on Back`, () =>
    withPort(() => {
      const key = `${kind}-${++serial}`;
      const route = `/discovery/${kind === "coach" ? "coaches" : "clubs/atlas/classess"}`;
      const list = new ElementPort("div", { "data-ssgoi-transition": route });
      const cards = [0, 1].map(
        () => new ElementPort("article", { [exit]: key }),
      );
      const links = cards.map((card) => {
        const link = new ElementPort("a", { href: `${route}/${key}` });
        card.append(link);
        list.append(card);
        return link;
      });
      const detail = new ElementPort("div").append(
        new ElementPort("section", { "data-zoom-enter-key": key }),
      );
      click(links[1]!);
      assert.equal(
        withClubMotionOrigin(html(list), html(detail), false, () => {
          assert.deepEqual(list.querySelectorAll(`[${exit}]`), [cards[1]]);
          return true;
        }),
        true,
      );
      assert.equal(
        withClubMotionOrigin(html(detail), html(list), true, () => {
          assert.deepEqual(list.querySelectorAll(`[${exit}]`), [cards[1]]);
          return true;
        }),
        true,
      );
      assert.equal(list.querySelectorAll(`[${exit}]`).length, 2);
    }));
  test(`${kind} motion captures a keyed list link without an article wrapper`, () =>
    withPort(() => {
      const key = `${kind}-${++serial}`;
      const list = new ElementPort("div", {
        "data-ssgoi-transition": "/services",
      });
      const link = new ElementPort("a", { href: "/detail", [exit]: key });
      const label = new ElementPort("span");
      link.append(label);
      list.append(link);
      const detail = new ElementPort("div").append(
        new ElementPort("section", { "data-zoom-enter-key": key }),
      );
      click(label);
      assert.equal(
        withClubMotionOrigin(html(list), html(detail), false, () => true),
        true,
      );
    }));
}
