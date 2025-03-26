import { PropsWithChildren } from "react"

const TwoFactorLayout = ({ children }: PropsWithChildren) => {
    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center">
            <div className="p-4 mx-auto max-w-screen-2xl md:p-6">{children}</div>
        </div>
    )
}
export default TwoFactorLayout