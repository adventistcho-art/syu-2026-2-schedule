"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

type DeptOption = {
  phoneParent: string;
  phoneDept: string;
  label: string;
  value: string;
};

type DutyRole = "leader" | "member";

export default function LoginPage() {
  const router = useRouter();
  const [options, setOptions] = useState<DeptOption[]>([]);
  const [deptValue, setDeptValue] = useState("");
  const [name, setName] = useState("");
  const [phoneExt, setPhoneExt] = useState("");
  const [dutyRole, setDutyRole] = useState<DutyRole>("member");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/login/dept-options");
        const data = await res.json();
        if (!cancelled) {
          setOptions(data.options ?? []);
        }
      } catch {
        if (!cancelled) setError("부서 목록을 불러오지 못했습니다.");
      } finally {
        if (!cancelled) setLoadingOptions(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const selected = options.find((o) => o.value === deptValue);
    if (!selected) {
      setError("실무부서(상위부서)를 선택하세요.");
      setIsLoading(false);
      return;
    }

    try {
      const result = await signIn("credentials", {
        phoneParent: selected.phoneParent,
        phoneDept: selected.phoneDept,
        name: name.trim(),
        phoneExt: phoneExt.trim(),
        dutyRole,
        redirect: false,
      });

      if (result?.error) {
        setError("정보가 일치하지 않습니다. 부서·이름·내선을 확인해주세요.");
      } else if (result?.ok) {
        router.push("/schedule");
        router.refresh();
      }
    } catch {
      setError("로그인 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-blue-50 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-200">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-[#003366] mb-2">
              학사일정 통합 시스템
            </h1>
            <p className="text-sm text-slate-600">
              삼육대학교 2026학년도 2학기 · 계정 맵 로그인
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="dept"
                className="block text-sm font-medium text-slate-700 mb-2"
              >
                실무부서(상위부서)
              </label>
              <select
                id="dept"
                value={deptValue}
                onChange={(e) => setDeptValue(e.target.value)}
                required
                disabled={loadingOptions}
                className="w-full px-4 py-3 text-sm border border-slate-300 rounded-lg focus:border-[#003366] focus:ring-2 focus:ring-[#003366]/20 outline-none bg-white"
              >
                <option value="">
                  {loadingOptions ? "부서 목록 불러오는 중..." : "선택하세요"}
                </option>
                {options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-slate-700 mb-2"
                >
                  이름
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="홍길동"
                  required
                  autoComplete="name"
                  className="w-full px-4 py-3 text-sm border border-slate-300 rounded-lg focus:border-[#003366] focus:ring-2 focus:ring-[#003366]/20 outline-none"
                />
              </div>
              <div>
                <label
                  htmlFor="phoneExt"
                  className="block text-sm font-medium text-slate-700 mb-2"
                >
                  내선번호
                </label>
                <input
                  id="phoneExt"
                  type="text"
                  inputMode="numeric"
                  value={phoneExt}
                  onChange={(e) => setPhoneExt(e.target.value)}
                  placeholder="3150"
                  required
                  className="w-full px-4 py-3 text-sm border border-slate-300 rounded-lg focus:border-[#003366] focus:ring-2 focus:ring-[#003366]/20 outline-none"
                />
              </div>
            </div>

            <fieldset>
              <legend className="block text-sm font-medium text-slate-700 mb-2">
                로그인 역할
              </legend>
              <div className="grid grid-cols-2 gap-2">
                <label
                  className={`flex items-center justify-center gap-2 px-3 py-3 text-sm rounded-lg border cursor-pointer ${
                    dutyRole === "member"
                      ? "border-[#003366] bg-blue-50 text-[#003366] font-semibold"
                      : "border-slate-200 text-slate-600"
                  }`}
                >
                  <input
                    type="radio"
                    name="dutyRole"
                    value="member"
                    checked={dutyRole === "member"}
                    onChange={() => setDutyRole("member")}
                    className="sr-only"
                  />
                  팀원
                </label>
                <label
                  className={`flex items-center justify-center gap-2 px-3 py-3 text-sm rounded-lg border cursor-pointer ${
                    dutyRole === "leader"
                      ? "border-[#003366] bg-blue-50 text-[#003366] font-semibold"
                      : "border-slate-200 text-slate-600"
                  }`}
                >
                  <input
                    type="radio"
                    name="dutyRole"
                    value="leader"
                    checked={dutyRole === "leader"}
                    onChange={() => setDutyRole("leader")}
                    className="sr-only"
                  />
                  팀장
                </label>
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                팀장으로 로그인하면 「전체일정으로 보내기」가 가능합니다. 맵
                팀장 여부와 무관합니다. 실무부서에 맵 팀장이 없으면 팀원도 보낼
                수 있습니다.
              </p>
            </fieldset>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || loadingOptions}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-white bg-[#003366] rounded-lg hover:bg-[#002244] transition-colors disabled:opacity-50"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isLoading ? "로그인 중..." : "로그인"}
            </button>
          </form>

          <div className="mt-6 p-4 bg-slate-50 rounded-lg">
            <p className="text-xs font-semibold text-slate-700 mb-2">
              로컬 테스트 예시
            </p>
            <div className="space-y-1 text-xs text-slate-600">
              <p>
                · 교무처(학사지원팀) / 이성영 /{" "}
                <code className="bg-white px-1.5 py-0.5 rounded">3150</code>
              </p>
              <p>
                · 교목처(교목처) / 정채영 /{" "}
                <code className="bg-white px-1.5 py-0.5 rounded">3333</code>
              </p>
              <p>
                · 일정 더미: 교무처(교무처) / 이교무 /{" "}
                <code className="bg-white px-1.5 py-0.5 rounded">3101</code>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
