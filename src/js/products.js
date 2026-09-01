// src/js/products.js

export const products = [
  {
    id: "bota-western-cherry",
    title: "Bota Western Cherry",
    subtitle: "Vintage 80s • Couro Legítimo",
    price: 489,
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBEXiHGdlEwjTeBvowFH4mu4BY3rQpStZZNwvhK-ZZ9X68WfHRXZ0TQIviwTksup1veBZItfUa_zo0YZ0_Xov1ypTnTNDGimDswhU-zXfJAKkf_EwmrqxyFaqGffcQgptHTitz8irrqHibsoFijPdJCbYaqwd9NzM2GZshwBQRflHys2U6Ss4zMAtDqfn9-gbcy6mIW3JB1IlAFkEWoZBoRBvoj2LtzYwmDkYcFS6rt1SdMFQKmnNohMLbBtCIv7T48-wJZolSzU9U",
    badge: "PEÇA ÚNICA",
    soldOut: false,
    category: "novidades",
    description:
      "Um garimpo raro direto dos anos 80. Couro legítimo texturizado em tom cereja profundo. Ideal para transformar qualquer look básico em uma produção com energia de personagem principal.",
  },
  {
    id: "bolsa-classic-caramel",
    title: "Bolsa Classic Caramel",
    subtitle: "Couro • Ferragem em Latão",
    price: 320,
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDkEOSSyAFHW0D6bjpzsYnc1ienU8JYYqNfRnmEHVLGB2ebLG0JhsqOhEmPkNmujL3ALbLfj9EwDxFm6E5-E9z430TTb9gbJUBnc5Dsyxf6iwynlDPWjQVwBnub71OxyNIQjGiJzlLrBga_osbIWUnrf_qs5npKogfiIAA3GR1S5w0QAOWR8rTKqZ5M6k8mHLgj7JuJFJxK9knEukQdoW_MLl9I2mZ67ole7Lt2aU1mvWbDXMu9fKOLII8DyR2SeW6MG6o-SsWRvy4",
    badge: "ICÔNICO",
    soldOut: false,
    category: "garimpos",
    description:
      "Bolsa estruturada em couro de alta durabilidade com pátina natural do tempo. O fecho giratório em latão envelhecido traz o charme dos bazares franceses antigos.",
  },
  {
    id: "oculos-sunset-orange",
    title: "Óculos Sunset Orange",
    subtitle: "Vintage • Proteção UV",
    price: 180,
    oldPrice: 180,
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDSGoDhLaMYmEFTiNVZyPj5hhFQMkwVlMSDfC_K533wcsM5h09Xbz5TyERZhR8EqxsLYL-_mMkVZ3baLky1S54_gfThbYZ07a7eI6xrWdm9ol3g3t_dbRoejWZ1NNjiSJY36chI9PZR4k5UfzhLP_7IZcmsjMjaZT_vPMIs3FSkGTvqL1qIB14XR1JdSyEty-PhST35nZBquYK5Ae5b8KEnxqrGHl_jmpvt3iTc2voYMpYC_tydX94adyIFqzOnS6MqgSer2sAy1u4",
    badge: "VENDIDO",
    soldOut: true,
    category: "achadinhos",
    description:
      "Armação translúcida icônica dos anos 70. Proteção UV testada. Este item já encontrou um novo lar extraordinário.",
  },
];

export function getProductById(id) {
  return products.find((product) => product.id === id);
}
