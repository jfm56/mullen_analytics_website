export default function PipelineStepper({ steps }) {
  return (
    <div className="flex items-start gap-0">
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1;
        const statusIcon = step.status === 'done' ? '✓' : step.status === 'error' ? '✕' : step.status === 'active' ? '●' : '○';
        const statusColor =
          step.status === 'done'    ? 'bg-green-500 text-white border-green-500'
          : step.status === 'error' ? 'bg-red-500 text-white border-red-500'
          : step.status === 'active'? 'bg-blue-500 text-white border-blue-500'
          : 'bg-white text-gray-400 border-gray-300';
        return (
          <div key={step.label} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center min-w-[64px]">
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all ${statusColor}`}>
                {statusIcon}
              </div>
              <span className="mt-1.5 text-xs font-medium text-gray-700 text-center leading-tight">{step.label}</span>
              {step.sub && <span className="text-[10px] text-gray-400 text-center">{step.sub}</span>}
            </div>
            {!isLast && (
              <div className={`flex-1 h-0.5 mx-1 mb-4 ${step.status === 'done' ? 'bg-green-400' : 'bg-gray-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
