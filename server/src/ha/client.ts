/** Home Assistant'a gönderilecek servis çağrısı. */
export interface HaServiceCall {
  domain: string;
  service: string;
  data: Record<string, unknown>;
}

export interface HaClient {
  callService(call: HaServiceCall): Promise<void>;
}

/** Test ve HA bağlı olmayan geliştirme için. Çağrıları kaydeder, hiçbir yere göndermez. */
export class MockHaClient implements HaClient {
  readonly calls: HaServiceCall[] = [];

  async callService(call: HaServiceCall): Promise<void> {
    this.calls.push(call);
  }
}

const SEGMENT = /^[a-z_]+$/;

type FetchLike = (input: string, init: { method: string; headers: Record<string, string>; body: string; signal: AbortSignal }) => Promise<{ ok: boolean; status: number }>;

/** HA REST API: POST /api/services/{domain}/{service}. Token yalnızca sunucuda tutulur. */
export class RestHaClient implements HaClient {
  constructor(
    private readonly baseUrl: string,
    private readonly token: string,
    private readonly fetchImpl: FetchLike = fetch as unknown as FetchLike,
    private readonly timeoutMs = 5000,
  ) {}

  async callService(call: HaServiceCall): Promise<void> {
    if (!SEGMENT.test(call.domain) || !SEGMENT.test(call.service)) {
      throw new Error("Geçersiz HA servis adı");
    }
    const url = `${this.baseUrl.replace(/\/+$/, "")}/api/services/${call.domain}/${call.service}`;
    const response = await this.fetchImpl(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(call.data),
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (!response.ok) {
      // Gövde ve token günlüğe yazılmaz, yalnızca durum kodu.
      throw new Error(`HA isteği başarısız: ${response.status}`);
    }
  }
}
