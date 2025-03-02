export function Tooltip({ message, children }: { message: string, children: React.ReactNode }) {
    return (
        <div className="group relative flex justify-end cursor-default">
            {children}
            <span className="absolute z-[999999] top-10 scale-0 transition-all rounded bg-gray-800 dark:bg-white p-2 text-xs text-white dark:text-black group-hover:scale-100">{message}</span>
        </div>
    )
}
