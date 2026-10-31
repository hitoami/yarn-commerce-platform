// #244：判断一笔订单是否买齐了某个材料包作品的毛线。
// 只认「已核实可公开」的作品；只比对「本店提供」且关联了精确 Variant 的毛线配件。
// 配件没写团数时至少要买 1 团（不猜用量）；一个作品没有任何可比对的毛线，就不算。

export const PUBLIC_SCOPE = '已核实可公开';
const YARN = '毛线';
const IN_SHOP = '本店提供';

export function kitsFromStorefront(data) {
  return (data?.metaobjects?.nodes ?? []).map(node => ({
    handle: node.handle,
    title: node.title?.value ?? node.handle,
    url: node.onlineStoreUrl ?? null,
    scope: node.scope?.value ?? '',
    materials: (node.components?.references?.nodes ?? []).map(component => ({
      variantId: component.variant?.reference?.id ?? null,
      quantity: Number(component.quantity?.value) || 0,
      supply: component.supply?.value ?? '',
      type: component.type?.value ?? '',
    })),
  }));
}

export function matchKits(lines, kits) {
  const bought = new Map();
  for (const line of lines) {
    const id = line.merchandise?.id ?? line.variantId;
    if (id) bought.set(id, (bought.get(id) ?? 0) + (line.quantity ?? 0));
  }
  return kits.filter(kit => {
    if (kit.scope !== PUBLIC_SCOPE) return false;
    const yarns = kit.materials.filter(m => m.type === YARN && m.supply === IN_SHOP && m.variantId);
    return yarns.length > 0 && yarns.every(m => (bought.get(m.variantId) ?? 0) >= Math.max(1, m.quantity));
  });
}

// 预先写好、只等顾客点发送的消息：格式固定，店员一眼能核对。
export function claimMessage(template, { order, kit }) {
  return template.replace('{order}', order).replace('{kit}', kit);
}

export function lineUrl(lineId, text) {
  const id = lineId.startsWith('@') ? lineId : `@${lineId}`;
  return `https://line.me/R/oaMessage/${encodeURIComponent(id)}/?${encodeURIComponent(text)}`;
}

export const KITS_QUERY = `query TutorialKits($language: LanguageCode) @inContext(language: $language) {
  metaobjects(type: "yarn_project", first: 50) {
    nodes {
      handle
      onlineStoreUrl
      title: field(key: "title") { value }
      scope: field(key: "release_scope") { value }
      components: field(key: "components") {
        references(first: 30) {
          nodes {
            ... on Metaobject {
              variant: field(key: "variant") { reference { ... on ProductVariant { id } } }
              quantity: field(key: "quantity") { value }
              supply: field(key: "supply") { value }
              type: field(key: "component_type") { value }
            }
          }
        }
      }
    }
  }
}`;
