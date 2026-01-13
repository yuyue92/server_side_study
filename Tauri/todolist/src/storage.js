import { exists, mkdir, readTextFile, writeTextFile, BaseDirectory } from "@tauri-apps/plugin-fs";
import { message } from "@tauri-apps/plugin-dialog";

const DIR = "tauri-react-demo";
const FILE = `${DIR}/data.json`;

const DEFAULT_DATA = {
    todos: [],
    users: []
};

export async function loadAppData() {
    try {
        // 确保目录存在（AppData 下）
        await mkdir(DIR, { baseDir: BaseDirectory.AppData, recursive: true });

        const ok = await exists(FILE, { baseDir: BaseDirectory.AppData });
        if (!ok) return { ...DEFAULT_DATA };

        const raw = await readTextFile(FILE, { baseDir: BaseDirectory.AppData });
        const parsed = JSON.parse(raw);

        // 兜底：字段缺失时补默认结构
        return {
            todos: Array.isArray(parsed?.todos) ? parsed.todos : [],
            users: Array.isArray(parsed?.users) ? parsed.users : []
        };
    } catch (e) {
        await message(`读取本地数据失败：${String(e)}`, { title: "Error", kind: "error" });
        return { ...DEFAULT_DATA };
    }
}

export async function saveAppData(data) {
    try {
        await mkdir(DIR, { baseDir: BaseDirectory.AppData, recursive: true });
        await writeTextFile(FILE, JSON.stringify(data, null, 2), { baseDir: BaseDirectory.AppData });
    } catch (e) {
        await message(`保存本地数据失败：${String(e)}`, { title: "Error", kind: "error" });
    }
}
