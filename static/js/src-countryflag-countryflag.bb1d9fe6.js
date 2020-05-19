(window.webpackJsonp=window.webpackJsonp||[]).push([[2],{"./src/countryflag/countryflag.mdx":function(e,o,s){"use strict";s.r(o),s.d(o,"default",(function(){return j}));var r=s("./node_modules/babel-preset-react-app/node_modules/@babel/runtime/helpers/esm/extends.js"),A=s("./node_modules/babel-preset-react-app/node_modules/@babel/runtime/helpers/esm/objectWithoutProperties.js"),a=s("../track-inspector/node_modules/react/index.js"),t=s.n(a),n=s("./node_modules/@mdx-js/react/dist/esm.js"),l=s("./node_modules/docz/dist/index.esm.js"),c=s("./node_modules/babel-preset-react-app/node_modules/@babel/runtime/helpers/esm/objectSpread2.js"),i=s("./node_modules/babel-preset-react-app/node_modules/@babel/runtime/helpers/esm/classCallCheck.js"),d=s("./node_modules/babel-preset-react-app/node_modules/@babel/runtime/helpers/esm/createClass.js"),g=s("./node_modules/babel-preset-react-app/node_modules/@babel/runtime/helpers/esm/createSuper.js"),u=s("./node_modules/babel-preset-react-app/node_modules/@babel/runtime/helpers/esm/inherits.js"),p=s("./node_modules/countryflag/dist/index.umd.js"),m=s.n(p),b=function(e){Object(u.a)(s,e);var o=Object(g.a)(s);function s(){return Object(i.a)(this,s),o.apply(this,arguments)}return Object(d.a)(s,[{key:"componentDidCatch",value:function(e,o){console.error(e,o)}},{key:"render",value:function(){var e=this.props,o=e.iso,s=e.iso2,r=e.svg,A=e.svgBorder,a=e.size,n=e.margin,l=e.className;if(!o&&!s)return console.error(" Country flag iso (iso 3) or iso2 code is required"),null;s&&console.warn("iso2 parameter is deprecated, use iso instead");var i=null;try{i=m()(o||s)}catch(d){console.warn("Country flag error, incorrect iso code for:",o||s)}return i?!0===r||null===i.emoji?t.a.createElement("img",{style:Object(c.a)({height:a,marginRight:n.right,marginLeft:n.left},A&&{outline:"1px solid var(--color-border-light, rgba(22, 63, 137, 0.15))"}),className:l,alt:i.name,src:i.svg}):t.a.createElement("span",{style:{fontSize:a},role:"img","aria-label":i.name},i.emoji):null}}]),s}(a.PureComponent);b.defaultProps={svg:!1,svgBorder:!0,className:"",size:"1em",margin:{left:"0.1em",right:"0.2em"}};var B=b;"undefined"!==typeof b&&b&&b===Object(b)&&Object.isExtensible(b)&&Object.defineProperty(b,"__filemeta",{enumerable:!0,configurable:!0,value:{name:"CountryFlag",filename:"src/countryflag/countryflag.js"}});var C={};function j(e){var o=e.components,s=Object(A.a)(e,["components"]);return Object(n.b)("wrapper",Object(r.a)({},C,s,{components:o,mdxType:"MDXLayout"}),Object(n.b)("h1",{id:"country-flag"},"Country flag"),Object(n.b)("h2",{id:"description"},"Description"),Object(n.b)("p",null,"Shows a country flag using an emoji by default. Can fallback to a SVG."),Object(n.b)("p",null,"Currently used in:\nTBD"),Object(n.b)("h2",{id:"available-properties"},"Available properties"),Object(n.b)(l.d,{of:B,mdxType:"Props"}),Object(n.b)("h2",{id:"basic-usage"},"Basic usage"),Object(n.b)(l.c,{__position:1,__code:'<CountryFlag iso="ES" />\n<CountryFlag iso="FRA" />',__scope:{props:this?this.props:s,Playground:l.c,Props:l.d,CountryFlag:B},__codesandbox:"N4IgZglgNgpgziAXKCA7AJjAHgOgBYAuAtlEqAMYD2qBMNSIAPOhAG4AEE6AvADogAnSpQL8AfIwD0LVmJABfADQg0mXACsEyEFRp0CDSQCojvVO3YAVPBDjsAwpUwBlAIYYARpSzs8rux4wdOyuAK4ElESuBBDkrlBQAJ7sAOZ0MALRMOjsoXBoKWYWAAZUmHDu6F5YGcU47ACSYOyJlKEA5AIw7OShAhBtdniUAO7sBH4Evq4ADjPp6IotbT3uRT14MOQA1uxtU20C7OiU5EMZMIi-BAQzcIiSkikQE6EeOFREkmXwldXfTl-nm8GTM6yay1C7Gw836dHI3XcyTgBAEoRSKVgdhGLzw4xsdgqwKwSxmsH83UytkR5lscFCMHW1FSuLe9UQAEozEZJGYIEQZpQBFMAEowVzkKZgIREdidcWS9oAbj5AqFooVBAAIgB5ACy7GlkTlXQlBAAtCciMrVYLhQ5IoLUPpDTK5ThJNhXALYDbUGYxWbdXqcF0MBkABTrZhsMTrCyMPAAZjEjjVzponDVwuy7BxEx6gKJVRBAkQUmTcfMFnYjBmYgjDSmUWSztzrnQLBi1Hi7BmQju40oqRgUxe7DDmH6qBSeZgCQ5Unr8draadLskVYT0ljijMJ16RH0ODSBAAorAjzQAEKJBroCOdYQEdpc1AcpUKZRen0wHCaMgdGoWh6EQFRsymYB2AABSgVxEhSIRQgwJZoIHOx5FdY12gPAAvP1-TtKZHGQ1FEgAMTg2cjVldoPTgARyABUiBESMAqOYmhWPY1wUgIiD2EDSUsNo01FTBVBdBRY5Tlw5wCESLF2G4dhgHWKIBGeVArnaAAGdgkxmLB2j3asZg7FgZx0gAWIz2AANiMkz1jAYDyO9aBEh0_hnEOBEHUwGChH4JYiGoSg4HMhFnOrVyaGcCBcMudgAEZrNM-QJKkqYAEE5mU9gIyg8gbCgdAw3YeQOWUsRCujGR2BRRSYG4YA8Pk5q4HkLca2AEroHK4IADIhvGRJ5koZp-rKiruDmuUwGQyUBlQdp2AAfg2AawwjaqrmmwbUEy6spBkKs3zMGF1WOGAwDCKApl2mq6pOvLl2rBMhIIHByMyFIrwIHqa1XNouIoqjODgSg-BAM9nH4dhNxXBMSLByjeMh6H-HIkUcoRpGPtrSQvp-v6AZ6qQ3vOswvxABimKoFi2I4xmwZ4lJ_y0ChgP0BhCOur6lig6C-hgNdqBdTCaJNTV2lta60MoGZLHG-ARLlfslfNBT5jgOXUH5-1WbI9n1faY3uKo_WzHIOC4DsVGyPR2dsBA9A7BFrpxYzSD1k-dcaC1Lh7GiEqIwyIQBCWNBXOqtTCakyhYBwCOhXDgRI-j1BY_WY71knSM45XR5MYAJkhm7-y2LJFk4FJUCFAo-wHbXVbgYvJGhOAoDQC0WAqDxYHNZ0sAtHvnQnTVJE1mZW91ldstUzHo6h0uljgVgUnXzfryFKd18SmBQtcTS0CWW3_DgAA5b1ukwlSJlsHAZ_bwmIGaCMAEJbGHEb2G_1eRdCYWETsnVOAhHwOiZoaCGP9CpwKTNVIUZdCyBVsJPAAjqECAXR0CvmRpPAgfRzCoFCAkFcx1gbv3gYA1SBDQF_hGCfVAj4f7l3MpkI8tAjjoMwFXOItBa55G6HAtAKJxR4LfMDShNZYBSghipUh5DCZkTocAmBGMVIW2ZrxCMcCAA--iy5SJrJhARJVCowCAcDEB1AobJyYQIFh7RHasQ0S7DOQos5UAzlsMcUNUHdFcmWEymN2CGOMRQlc1Cv7s2ql0IhTj2BKKgBJYGCTiGNU3speaqIGThKMezFOYV1AQByYoshUANovRsbWfkhR1EWCarAVq8danA02BAFIhArj5CSqZdpNYNJaRFF0np7BhloFDGMggAzBkTJPlpAAMrdAgVxJmoBwLAMAsyCHAxwAciMG8Ui7wEFOdgf82nzIsPsceyV2gpTsvYrg7BWAnwjOac0VAoBCnNF4M5GRzQ926bMicKQPCuAjKXNeDkkxLBSkmAA7EsXSOAUoAFYOQchitcqqczanyBkbUi-9sb5HlaiS6-t8iU2PiAQVqRTUDUr2Y1RiDKqI4GOTSiwBNgZ7RqTYxgkV3CNQUi04AUE4oEASklXph9KqYSEC0_g9SEYnwgK4IFrhAhQHZbxHATKjzdRZcAIpMASkQG5UTYVqAgbsBMcdPOqBXHg31TPFWusCpXJ_lcRWys26ctRAUHAtgxRYJwdkOZxzfUDg9fAHAXgk5Rp3nvDIMalZxrgAm4QUAo2H3Tf63Wgbpxbz9nbKlR4C2ZuLQUOZGyq0BrgH4eYRUVzbLWUFDNjag0znxROGZDai0ohLXMvFZgnUuudjgTAd0yEED9XYFSVzo2GniHAI-6xjmnKnFcPJG7qyUrJfcnFjV81yhSuak99a1HA3bTpVFF7rR9v6CC-9OBS6XtHRlCSV17QzvusRUGTsqI0yUCAKK2xeJ_k0NQQCugQIGDAlc_ghrGRIHYPwH4xZqiAp_GSNDcz-CsAyPkag_Arj8FRVRkK6x-DlHIP0GY3Z_Tof4DlU9v5oRYG9PhyuPzEi5jyE3MSFosN_FLDR6s_AohoHIxhlQ4YNDtxAIRkAfC6CYEkhAeAcmrkWDo7JOT_AAB6KUcBJjRZJ4G_ARNGZAKZ-yaKzO6SszWfgM8546dY_ZjFOBHOl1c_poCTN2Z2eM6XHA1l32BfkyJy0kQwspUcylZz_Bc7jtpth7wHxqCQA5jB1AcGeagRAGpEAtAfRZHI5h00tBzRxdmDMfg8gFCEqAA",mdxType:"Playground"},Object(n.b)(B,{iso:"ES",mdxType:"CountryFlag"}),Object(n.b)(B,{iso:"FRA",mdxType:"CountryFlag"})))}j&&j===Object(j)&&Object.isExtensible(j)&&Object.defineProperty(j,"__filemeta",{enumerable:!0,configurable:!0,value:{name:"MDXContent",filename:"src/countryflag/countryflag.mdx"}}),j.isMDXComponent=!0}}]);
//# sourceMappingURL=src-countryflag-countryflag.07944416b20b03b7a3c0.js.map