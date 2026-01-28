import Image from "next/image";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
  onClick?: () => void;
}

export function Logo({ size = "md", showText = true, className = "", onClick }: LogoProps) {
  const sizeClasses = {
    sm: {
      container: "w-6 h-6",
      image: 16,
      text: "text-base",
    },
    md: {
      container: "w-8 h-8",
      image: 24,
      text: "text-xl",
    },
    lg: {
      container: "w-10 h-10",
      image: 28,
      text: "text-2xl",
    },
  };

  const { container, image, text } = sizeClasses[size];

  return (
    <div
      className={`flex items-center space-x-2 ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      <div className={`${container} bg-primary rounded-lg flex items-center justify-center flex-shrink-0`}>
        <Image
          src="/Vetted-orange.png"
          alt="Vetted Logo"
          width={image}
          height={image}
          className="w-full h-full object-contain p-1"
        />
      </div>
      {showText && (
        <span className={`${text} font-bold text-foreground`}>
          Vetted
        </span>
      )}
    </div>
  );
}
