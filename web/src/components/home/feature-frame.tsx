type FeatureFrameProps = {
  title: string;
  description: string;
  tag: string;
};

export function FeatureFrame({ title, description, tag }: FeatureFrameProps) {
  return (
    <article className="glass-frame flex h-full flex-col gap-4 px-5 py-5 sm:px-6 sm:py-6">
      <span className="badge badge-neutral badge-outline w-fit">{tag}</span>
      <h2 className="text-lg font-bold">{title}</h2>
      <p className="text-sm leading-relaxed text-base-content/75">{description}</p>
      <button className="btn btn-link btn-sm mt-auto w-fit px-0 no-underline">
        Daha Fazla
      </button>
    </article>
  );
}
