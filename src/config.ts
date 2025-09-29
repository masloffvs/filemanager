import * as fs from "fs";
import * as path from "path";

export type SortKey = 'name' | 'size' | 'modified' | 'created';
export type SortOrder = 'asc' | 'desc';
export type SortSpec = { key: SortKey; order: SortOrder };

export type AppConfig = {
  indexRootPath: string;
  reindexIntervalSec: number;
  folderSort: SortSpec;
  fileSort: SortSpec;
  serverPort: number;
  serverHost: string;
};

const DEFAULT_CONFIG: AppConfig = {
  indexRootPath: "./",
  reindexIntervalSec: 10,
  folderSort: { key: 'name', order: 'asc' },
  fileSort: { key: 'name', order: 'asc' },
  serverPort: 3000,
  serverHost: "127.0.0.1",
};

export class ConfigStore {
  private filePath: string;
  private value: AppConfig = { ...DEFAULT_CONFIG };

  constructor(filePath: string = ".index/config.json") {
    this.filePath = filePath;
  }

  private ensurePath() {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }

  load(): AppConfig {
    try {
      this.ensurePath();
      if (fs.existsSync(this.filePath)) {
        const text = fs.readFileSync(this.filePath, "utf8");
        const parsed = JSON.parse(text);
        this.value = { ...DEFAULT_CONFIG, ...parsed };
      } else {
        this.value = { ...DEFAULT_CONFIG };
        this.save();
      }
    } catch {
      this.value = { ...DEFAULT_CONFIG };
    }
    return this.value;
  }

  get(): AppConfig {
    return this.value;
  }

  set(partial: Partial<AppConfig>): AppConfig {
    this.value = { ...this.value, ...partial };
    this.save();
    return this.value;
  }

  save() {
    this.ensurePath();
    fs.writeFileSync(this.filePath, JSON.stringify(this.value, null, 2), "utf8");
  }
}

export default ConfigStore;
