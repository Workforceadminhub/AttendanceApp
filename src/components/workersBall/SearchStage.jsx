import { SparklesIcon } from "@heroicons/react/24/outline";

export default function SearchStage(props) {
  const {
    stage,
  } = props;
  return (
    <>
            {stage === "search" && (
              <div className="space-y-6">
                {/* Official 2026 Gala Event Card */}
                <aside
                  aria-label="Event Details"
                  className="wb26-panel overflow-hidden rounded-2xl border border-ink-800 bg-[#0A0E1A] text-cream shadow-xl"
                >
                  <div className="flex flex-col sm:flex-row items-center sm:items-stretch">
                    <div className="w-full sm:w-44 md:w-48 shrink-0 bg-black/40 flex items-center justify-center p-3 border-b sm:border-b-0 sm:border-r border-ink-800">
                      <img
                        src="/wb26/official-flyer.jpg"
                        alt="Harvesters Gbagada Workers Ball 2026: All Stars Jersey and Jazz"
                        className="w-full h-auto max-h-56 sm:max-h-none object-cover rounded-lg shadow-md select-none"
                      />
                    </div>
                    <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between space-y-4">
                      <div>
                        <div className="inline-flex items-center gap-1.5 text-2xs font-mono uppercase tracking-widest text-[#F6B042] font-semibold mb-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#F6B042] animate-pulse" />
                          <span>Harvesters Gbagada Gala</span>
                        </div>
                        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                          All Stars Workers Ball
                        </h2>
                        <p className="text-sm font-semibold text-[#F6B042] mt-0.5">
                          Theme: Jersey &amp; Jazz
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-ink-800/80 text-xs">
                        <div>
                          <span className="block text-2xs font-mono uppercase tracking-wider text-ink-400">Date &amp; Time</span>
                          <span className="font-semibold text-cream">Sun 29th Nov &middot; 3PM</span>
                        </div>
                        <div>
                          <span className="block text-2xs font-mono uppercase tracking-wider text-ink-400">Dress Code</span>
                          <span className="font-semibold text-[#F6B042]">Jersey</span>
                        </div>
                        <div className="col-span-2">
                          <span className="block text-2xs font-mono uppercase tracking-wider text-ink-400">Venue</span>
                          <span className="font-medium text-ink-200">Main Auditorium, Harvesters Gbagada</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </aside>

                <section className="wb26-panel qc-card p-6 sm:p-8 text-center space-y-4">
                  <div className="mx-auto w-12 h-12 rounded-full bg-sienna/10 border border-sienna/20 flex items-center justify-center text-sienna">
                    <SparklesIcon className="h-6 w-6" />
                  </div>
                  <div className="space-y-2">
                    <span className="qc-eyebrow">Status Update &middot; Workers Ball 2026</span>
                    <h2 className="text-xl font-semibold text-ink-900">
                      Registration Will Be Back Up Soon
                    </h2>
                    <p className="text-sm text-ink-600 max-w-md mx-auto leading-relaxed">
                      We&rsquo;re currently updating the Workers Ball 2026 registration portal. New registrations are temporarily paused and will be back up shortly.
                    </p>
                  </div>
                  <div className="rounded-xl border border-ink-200 bg-cream p-4 text-xs text-ink-600 max-w-md mx-auto leading-relaxed">
                    If you received a personal invitation email, please use the unique link in your inbox to confirm your attendance and claim your{" "}
                    <strong className="text-ink-900 font-mono">HGWB</strong> Gala Pass.
                  </div>
                </section>
              </div>
            )}
    </>
  );
}
