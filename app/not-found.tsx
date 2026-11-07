import { SharePromo } from "@/components/SharePromo";

export default function NotFound() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
      <p className="text-center text-lg font-medium text-slate-700 dark:text-slate-200 sm:text-xl">
        Bu medya artık sunucularda mevcut değil.
      </p>
      <SharePromo />
    </div>
  );
}
