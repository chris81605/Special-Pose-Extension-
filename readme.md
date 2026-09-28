# 給使用者
* 穿上特殊姿態服裝時避免穿模
    - 服裝包作者有單獨拆身體則支援膚色效果否則不支援。
* 隱藏不兼容的貼圖
    - 沒有適配特殊姿態的身體塗鴉及不明液體貼圖，所以直接隱藏不顯示。

# 使用說明
* 前置需求：安裝`maplebirch`版本不低於`3.0.15`
* 安裝本模組，然後就沒有然後了，本模組在背景運作，沒有UI。
    
# 給服裝模組作者   
* 建議將身體單獨拆出來放入`img/clothes/upper/<你的服裝>/body/` 
    ```
    body -> basenoarms.png
    lefrarm -> leftarm.png
    rightarm -> rightarm.png
    breasts -> breasts${breastSize}.png`(支援熊差)    
    ```
* ~~建議給服裝打包一套透明的內衣褲避免內衣褲穿模~~
    * ~~你不希望Pc是不穿內衣褲的吧？~~
    * 不需要透明內衣褲了，直接隱藏了
* 如何標記特姿服裝？
    - 打包時將對應服裝的json新增一個key: `isSpecial:true`即可        
    
    ```
    index: 7,
    name: "picaglacialLady",
	name_cap: "picaglacialLady",
	cn_name_cap: "冰川粉黛",
	variable: "picaglacialLady",
    <中略>
	outfitPrimary: {lower: "picaglacialLady"},
			
	isSpecial:true	    <=加這個
		
    ```
    
    