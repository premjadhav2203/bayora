"""Model backends. MockModel simulates a shared prefix/KV cache (hit = faster) so the
timing side-channel can be demonstrated anywhere. OllamaModel is the real backend."""
import hashlib, json, random, time, urllib.request


class MockModel:
    def __init__(self, hit_ms=10.0, miss_ms=30.0, jitter_ms=2.5):
        self.hit_ms, self.miss_ms, self.jitter = hit_ms, miss_ms, jitter_ms
        self.cache = {}            # key -> owning session
        self.interference_ms = 0   # simulated noisy neighbour (CPU hog): adds 50-100% of this latency

    def generate(self, sid, salt, prompt, salting=True):
        key = hashlib.sha256(((salt if salting else "") + prompt[:256]).encode()).hexdigest()
        owner = self.cache.get(key)
        hit = owner is not None
        self.cache.setdefault(key, sid)
        extra = random.uniform(0.5, 1.0) * self.interference_ms
        time.sleep(max((self.hit_ms if hit else self.miss_ms) + random.gauss(0, self.jitter) + extra, 0) / 1000)
        return f"[mock-llm] {prompt[:60]}", {"cache_hit": hit, "cross_session_hit": hit and owner != sid}

    def flush(self, sid):
        self.cache = {k: v for k, v in self.cache.items() if v != sid}


class OllamaModel:
    def __init__(self, url="http://model:11434", model="qwen2.5:1.5b"):
        self.url, self.model = url, model

    def _post(self, body):
        req = urllib.request.Request(self.url + "/api/generate", json.dumps(body).encode(),
                                     {"Content-Type": "application/json"})
        return json.loads(urllib.request.urlopen(req, timeout=120).read())

    def generate(self, sid, salt, prompt, salting=True):
        full = (f"[session {salt}]\n" if salting else "") + prompt   # per-session prefix salt
        r = self._post({"model": self.model, "prompt": full, "stream": False,
                        "options": {"num_predict": 64}})
        return r.get("response", ""), {}

    def flush(self, sid):
        self._post({"model": self.model, "prompt": "", "keep_alive": 0})   # unload => drop KV cache