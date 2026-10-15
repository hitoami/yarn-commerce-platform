# Yarn Commerce Domain

该上下文描述当前毛线、作品材料方案与商品之间的统一语言。当前 MVP 边界采用用户 2026-10-15 对 #131 / PR #136 的确认；未来平台词汇不自动进入当前实施范围。

## Language

**Product**:
面向顾客提供的一类可售商品。
_Avoid_: Item, Listing

**Variant**:
由颜色、材质、规格或其他选项确定的可购买 Product 配置。
_Avoid_: SKU（除非明确指库存编码）

**Project**:
围绕一个目标作品组织真实照片、所需毛线与团数、制作准备及教程领取安排的内容入口。当前使用 yarn_project，不是可购买 Product；公开的完整方案在消费者界面称「材料包」。
_Avoid_: Kit, Product

**Draft Project**:
团队正在准备、但材料清单或主要 Tutorial 尚未达到公开标准的 Project。它不会对 Visitor 或 Member 公开。
_Avoid_: Inspiration, Published Project

**Inspiration**:
品牌或编辑策划的作品展示内容，不承诺本店供货。当前新体验不设仅灵感分类；旧记录不自动迁移、公开或删除。
_Avoid_: Project, Tutorial

**Project Kit**:
某个 Project 的默认毛线购买方案，团队与消费者称「材料包」。当前由 yarn_material 引用 Variant × 团数，不是独立 Product，没有独立库存或包内折扣；顾客可选同款可售颜色，购物车中仍是各毛线 Variant。此前整包采购、独立库存模式不适用于 #131。
_Avoid_: Project, Tutorial

**Finished Piece（成品）**:
可直接购买的手工实物，是 Product 的一种。当前独立购买，不与材料包互链；按实际库存展示余量，售罄保留。
_Avoid_: Member Work, Project

**Yarn Product（毛线）**:
以卷／团为单位单独销售的线材 Product。其顾客通常自带明确制作目标，选购不依赖 Project 引导。
_Avoid_: Material Requirement, Kit Component

**Tool Product（工具）**:
钩针、棒针、辅料等工具 Product 的既有或未来记录。工具不在 #131 当前售卖范围；制作准备中仍可说明自备工具，不自动增购。
_Avoid_: Kit Component, Material Requirement

**Reference Standard（参照标准）**:
帮助顾客估算用量或成品尺寸的参照信息，例如一卷线可织多大的围巾；它是内容提示，不构成 Material Requirement，也不构成完成承诺。
_Avoid_: Material Requirement, Product Recommendation

**Material Requirement**:
完成某个 Project 所需材料或工具的通用规格与物理用量，例如线材材质、粗细、所需重量、所需长度或针号；它独立于当前可售商品，不以“几团某商品”表达。
_Avoid_: Product, Variant, Kit Component

**Product Recommendation**:
将 Material Requirement 关联到当前适用 Product 或 Variant 的可替换推荐，不代表该商品是完成 Project 的唯一选择。
_Avoid_: Material Requirement, Kit Component

**Kit Component**:
当前 Project Kit 中一项毛线 Variant 及其所需团数，使用既有 yarn_material 承载。只引用真实商品，不复制库存。其他自备材料或工具可说明但不进入当前材料包加购。
_Avoid_: Variant, Copied Product

**Tutorial**:
帮助完成 Project 的图解、视频或步骤资料。当前通过官方 LINE，由店员核对订单号和作品名称后发送；本轮没有站内教程阅读、自动核验或发放。
_Avoid_: Project

**Customization Inquiry**:
顾客围绕目标作品提出、等待团队人工确认可制作性、报价与交期的定制意向，不是订单或已接受的报价。
_Avoid_: Order, Confirmed Quote

**Visitor**:
尚未登录平台的访问者。
_Avoid_: User, Customer

**Member**:
已注册并登录平台的参与者。Member 无需购买即可收藏公开作品与 Product；My Project 和制作进度属于后续能力。
_Avoid_: User, Customer, Buyer

**Shopify Customer**:
Shopify 中用于承载商业身份的客户记录；它可能在首次订单产生之前就已存在。
_Avoid_: Member, Buyer

**Buyer**:
至少完成过一次购买的 Member。Buyer 是同一个人的商业角色，不是独立账号。
_Avoid_: Customer

**Creator**:
创作 Project、Tutorial 或相关内容的 Member。
_Avoid_: Seller

**Seller**:
未来获准通过平台销售 Product 或 Project Kit 的 Member。
_Avoid_: Creator

**My Project**:
Member 管理个人 Making 并记录制作进度的空间，不要求先购买对应 Product 或 Project Kit。
_Avoid_: Order History, Purchased Projects

**Favorite**:
Member 对公开作品（包括当前作品库的仅灵感条目）或 Product 表达兴趣的收藏关系，登录后可跨设备找回。收藏不代表已经计划、开始制作或购买，也不会创建 Making。作品与关联商品各自收藏，不自动相互收藏。
_Avoid_: My Project, Making

**Making**:
Member 明确选择“开始制作”后，根据某个 Project 发起的一次实际制作，独立记录所用颜色、尺寸、材料和进度。同一个 Project 可以被同一 Member 制作多次。
_Avoid_: Project, Tutorial, Order

**Member Work**:
Member 通过编织或钩织完成并选择分享的作品；它按会员创作来源定义，不要求附带 Tutorial，可以使用购买的 Project Kit、单独购买的材料或自有材料。
_Avoid_: Project, Product

## Relationships

- 一个 **Product** 有一个或多个 **Variants**；价格、可售性、库存和购物车真值只在 Shopify。
- **Project** 用真实照片、所需毛线/团数与教程安排形成可公开方案。资料未齐是 **Draft Project**，不因演示开关出现在当前材料包路径。
- **Material Requirement** 描述制作要求；**Product Recommendation** 关联适用商品。当前 **Project Kit** 用 **Kit Components** 表达可购买的默认毛线与团数，不成为新的 Product。
- 默认原作色号与团数可由顾客改为同款、相同其他规格的可售颜色；最终加入购物车的是选定 **Variant** 与数量。
- 任一所需毛线缺货、未定价或资料缺失时禁止整份加购，不能静默跳过或自动替代；仍可逐项购买其他可售毛线。
- **Project** 的公开完整性与库存不同：资料完整的材料包可继续展示缺货项；缺货不自动隐藏真实作品。
- **Finished Piece** 独立销售，当前不与材料包互链，不推定顾客可以从成品购买材料或教程。
- **Tutorial** 的人工领取须有对应支持教程的作品安排；购买普通毛线不自动获得任何教程。
- **Visitor** 可以浏览并购买；**Shopify Customer** 是商业身份记录，可能早于首笔订单。**Buyer** 表示已购买角色，不是额外账号。
- **Favorite**、**My Project**、**Making**、**Member Work** 与社区属于各自既有或后续平台范围，不能从材料包购买推定已经创建制作记录或获得创作者身份。

## Example dialogue

> **Dev:** “材料包是不是一种独立商品？”
> **Domain expert:** “不是。Project 展示作品；Project Kit 是其中的毛线方案。顾客选择颜色与团数，购物车加入实际毛线 Variant。”

## 词义边界

- 当前「材料包」「编织包」「kit」指内容中的 **Project Kit** 方案，不指旧独立库存套装。
- **Draft Project** 表示资料尚未达到公开标准，不能以 Inspiration 或样例名义绕过当前公开要求。
- 「暂未开售」表示售价或销售资料尚未确认；「售罄」表示已确认商品的库存状态，两者不能混用。
- 色卡是颜色参考，不等于 Shopify 可售 **Variants**，不证明任何库存。
- **Customization Inquiry**、**Tool Product**、**Seller** 等词汇可描述历史或未来领域，当前 #131 不实现这些购买或服务路径。
- Shopify API 的 Customer 写作 **Shopify Customer**；内部表达须区分浏览者、会员、买家等实际角色，不混用「用户」。
