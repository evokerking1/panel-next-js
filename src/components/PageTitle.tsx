interface Props {
  title: string;
  subtitle?: string;
}

export default function PageTitle({ title, subtitle }: Props) {
  return (
    <div className="mb-6">
      <h1 className="text-base font-medium text-neutral-800 dark:text-white">{title}</h1>
      {subtitle && <p className="text-sm text-neutral-500 mt-0.5">{subtitle}</p>}
    </div>
  );
}
