# Implementation Plan: 智能巡检 H5（007）

**Branch**: `p3-p4-remaining-features` | **Date**: 2026-11-14 | **Spec**: [spec.md](./spec.md)

## Summary
实现执行版模块 6 移动巡检：空白布局，扫码（html5-qrcode）/手动选设备，6 项清单（正常/异常+备注），
拍照≤5，canvas 签名（清空/确认），提交校验+异常自动转单+成功页，历史 tab+详情。mock 可独立演示。

## Technical Context
TS5 + Vue3；锁定栈（html5-qrcode/element-plus/axios）无新增；原生 canvas 签名；mock inspection.json；
测试=无头移动视口+build+零报错；移动优先；仅 frontend/。

## Constitution Check
I（模块6）PASS；II（html5-qrcode/canvas 在锁定栈）PASS；III PASS；IV PASS；V PASS；VI PASS；VII PASS。Post-design PASS。

## Project Structure
```
frontend/src/
├── api/inspection.ts           # upload/submit/list/detail
├── api/mock/inspection.json    # 历史巡检样本
├── components/SignaturePad.vue # canvas 签名（清空/确认）
└── views/inspection/InspectionView.vue  # 扫码/清单/拍照/签名/提交/成功/历史
```
**Structure Decision**: 路由 /inspection 已 blank；组件自包含移动布局；扫码降级手动选设备。

## Complexity Tracking
无违规。