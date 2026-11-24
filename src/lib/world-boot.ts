import { DEFAULT_WORLD_ID } from "@/themes";
import { WORLD_IDS } from "@/themes/types";

export const STORAGE_KEY = "enestu_world";

/** 本文を隠している間だけ <html> に付ける属性。 */
export const PENDING_ATTRIBUTE = "data-world-pending";

/**
 * 画面が描かれる前に実行するスクリプト。
 * 既定と違う世界線なら、Reactが文言を切り替えるまで本文を隠し、ちらつきを防ぐ。
 */
export const WORLD_BOOT_SCRIPT = `(function(){try{
var w=localStorage.getItem(${JSON.stringify(STORAGE_KEY)});
if(${JSON.stringify(WORLD_IDS)}.indexOf(w)<0||w===${JSON.stringify(DEFAULT_WORLD_ID)})return;
var r=document.documentElement;
r.setAttribute("data-world",w);
r.setAttribute(${JSON.stringify(PENDING_ATTRIBUTE)},"");
}catch(e){}})()`;
