import {
  Shield,
  Code2,
  Palette,
  Package,
  Megaphone,
  BarChart3,
  Handshake,
  Settings,
  Calculator,
  UserPlus,
  Scale,
  type LucideIcon,
} from "lucide-react";

// Get guild icon based on guild name
export const getGuildIcon = (guildName: string): LucideIcon => {
  const name = guildName.toLowerCase();

  if (name.includes('engineering') || name.includes('technology')) {
    return Code2;
  } else if (name.includes('design') || name.includes('ux')) {
    return Palette;
  } else if (name.includes('product')) {
    return Package;
  } else if (name.includes('marketing') || name.includes('growth')) {
    return Megaphone;
  } else if (name.includes('data') || name.includes('analytics')) {
    return BarChart3;
  } else if (name.includes('sales') || name.includes('business')) {
    return Handshake;
  } else if (name.includes('operations') || name.includes('strategy')) {
    return Settings;
  } else if (name.includes('finance') || name.includes('accounting')) {
    return Calculator;
  } else if (name.includes('people') || name.includes('hr')) {
    return UserPlus;
  } else if (name.includes('legal') || name.includes('compliance')) {
    return Scale;
  }

  return Shield; // Default fallback
};

// Get guild color gradient based on guild name
// Primary guilds use orange gradients, supporting guilds use warm neutrals
export const getGuildColor = (guildName: string): string => {
  const name = guildName.toLowerCase();

  // Primary guilds: Full saturation orange gradients
  if (name.includes('engineering') || name.includes('technology')) {
    return 'from-primary to-orange-secondary';
  } else if (name.includes('design') || name.includes('ux')) {
    return 'from-orange-secondary to-orange-light';
  } else if (name.includes('product')) {
    return 'from-primary/90 to-orange-secondary/90';
  } else if (name.includes('marketing') || name.includes('growth')) {
    return 'from-primary to-orange-light';
  } else if (name.includes('data') || name.includes('analytics')) {
    return 'from-orange-secondary/80 to-primary/80';
  } else if (name.includes('sales') || name.includes('business')) {
    return 'from-primary/70 to-orange-secondary/70';
  }

  // Supporting guilds: Neutral grays
  else if (name.includes('operations') || name.includes('strategy')) {
    return 'from-gray-medium to-gray-light';
  } else if (name.includes('finance') || name.includes('accounting')) {
    return 'from-tan-accent to-beige-light';
  } else if (name.includes('people') || name.includes('hr')) {
    return 'from-gray-light to-gray-lighter';
  } else if (name.includes('legal') || name.includes('compliance')) {
    return 'from-gray-medium to-gray-lighter';
  }

  return 'from-primary to-orange-secondary'; // Default
};

// TypeScript interface for guild detailed information
export interface GuildDetailedInfo {
  focus: string;
  details: string;
  examples: string;
}

// Get detailed guild information for tooltips and descriptions
export const getGuildDetailedInfo = (guildName: string): GuildDetailedInfo => {
  const name = guildName.toLowerCase();

  if (name.includes('engineering') || name.includes('technology')) {
    return {
      focus: 'Technical Excellence & Innovation',
      details: 'Expert engineers review candidates on system design, code quality, architecture decisions, and problem-solving abilities. Members gain access to cutting-edge projects and technical leadership roles.',
      examples: 'Backend, Frontend, Full-Stack, DevOps, Mobile, Security Engineers'
    };
  } else if (name.includes('design') || name.includes('ux')) {
    return {
      focus: 'User-Centered Design & Creativity',
      details: 'Senior designers evaluate portfolio quality, design thinking, user research capabilities, and visual execution. Access exclusive opportunities with top design-forward companies.',
      examples: 'Product Designer, UX Researcher, UI Designer, Design Systems, Brand Designer'
    };
  } else if (name.includes('product')) {
    return {
      focus: 'Strategy & Product Leadership',
      details: 'Product leaders assess strategic thinking, roadmap planning, stakeholder management, and execution track record. Connect with companies building innovative products.',
      examples: 'Product Manager, Product Lead, VP Product, Chief Product Officer, Product Strategy'
    };
  } else if (name.includes('marketing')) {
    return {
      focus: 'Growth & Brand Strategy',
      details: 'Marketing experts evaluate campaign strategy, growth metrics, creative execution, and brand building. Access roles at high-growth startups and established brands.',
      examples: 'Growth Marketing, Content Strategy, Brand Marketing, Performance Marketing, CMO'
    };
  } else if (name.includes('data')) {
    return {
      focus: 'Data-Driven Insights & ML',
      details: 'Data professionals review analytical skills, statistical knowledge, ML expertise, and business impact. Work on transformative data initiatives and AI projects.',
      examples: 'Data Scientist, ML Engineer, Data Analyst, Analytics Lead, AI Researcher'
    };
  } else if (name.includes('sales')) {
    return {
      focus: 'Revenue Growth & Partnerships',
      details: 'Sales leaders evaluate deal-closing ability, relationship building, territory management, and revenue impact. Join high-performing sales organizations.',
      examples: 'Account Executive, Sales Lead, VP Sales, Business Development, Revenue Operations'
    };
  } else if (name.includes('operations')) {
    return {
      focus: 'Efficiency & Strategic Execution',
      details: 'Operations experts assess process optimization, cross-functional leadership, and operational excellence. Drive efficiency at scaling companies.',
      examples: 'Operations Manager, COO, Strategy Lead, Program Manager, Operations Analyst'
    };
  } else if (name.includes('finance')) {
    return {
      focus: 'Financial Strategy & Planning',
      details: 'Finance professionals review analytical rigor, financial modeling, strategic planning, and business acumen. Shape financial strategy at growing companies.',
      examples: 'Finance Manager, FP&A Analyst, CFO, Controller, Financial Planning, Accounting'
    };
  } else if (name.includes('people') || name.includes('hr')) {
    return {
      focus: 'Talent & Organizational Development',
      details: 'People leaders evaluate talent strategy, culture building, organizational design, and employee experience expertise. Build exceptional workplace cultures.',
      examples: 'People Operations, Talent Acquisition, CHRO, HR Business Partner, Recruiting Lead'
    };
  } else if (name.includes('legal')) {
    return {
      focus: 'Legal Strategy & Compliance',
      details: 'Legal experts assess regulatory knowledge, contract negotiation, risk management, and business advisory skills. Protect and enable business growth.',
      examples: 'General Counsel, Legal Counsel, Compliance Manager, IP Attorney, Contract Specialist'
    };
  }

  return {
    focus: 'Professional Excellence',
    details: 'Industry experts review candidates based on their domain expertise, track record, and professional achievements. Gain access to vetted opportunities matching your skills.',
    examples: 'Various professional roles'
  };
};

// For card preview (2-line description)
export const getGuildPreviewDescription = (guildName: string): string => {
  const info = getGuildDetailedInfo(guildName);
  return `${info.focus}. ${info.details.split('.')[0]}.`;
};

// For InfoTooltip (structured content)
export const formatGuildTooltipContent = (guildName: string): string => {
  const info = getGuildDetailedInfo(guildName);
  return `**${info.focus}**\n\n${info.details}\n\n**Common Roles:**\n${info.examples}`;
};

// Get guild background color (lighter version for headers/banners)
// Primary guilds use orange, supporting guilds use warm neutrals
export const getGuildBgColor = (guildName: string): string => {
  const name = guildName.toLowerCase();

  // Primary guilds: Orange gradients with good contrast for white text
  if (name.includes('engineering') || name.includes('technology')) {
    return 'bg-gradient-to-r from-[#ff6a00] to-[#ed8133] dark:from-[#ff7a00] dark:to-[#ed8133]';
  } else if (name.includes('design') || name.includes('ux')) {
    return 'bg-gradient-to-r from-[#ed8133] to-[#ffac70] dark:from-[#ed8133] dark:to-[#ffac70]';
  } else if (name.includes('product')) {
    return 'bg-gradient-to-r from-[#ff6a00]/90 to-[#ed8133]/90 dark:from-[#ff7a00]/90 dark:to-[#ed8133]/90';
  } else if (name.includes('marketing') || name.includes('growth')) {
    return 'bg-gradient-to-r from-[#ff6a00] to-[#ffac70] dark:from-[#ff7a00] dark:to-[#ffac70]';
  } else if (name.includes('data') || name.includes('analytics')) {
    return 'bg-gradient-to-r from-[#ed8133]/80 to-[#ff6a00]/80 dark:from-[#ed8133]/80 dark:to-[#ff7a00]/80';
  } else if (name.includes('sales') || name.includes('business')) {
    return 'bg-gradient-to-r from-[#ff6a00]/70 to-[#ed8133]/70 dark:from-[#ff7a00]/70 dark:to-[#ed8133]/70';
  }

  // Supporting guilds: Neutral grays with warmth
  else if (name.includes('operations') || name.includes('strategy')) {
    return 'bg-gradient-to-r from-gray-600 to-gray-500 dark:from-gray-700 dark:to-gray-600';
  } else if (name.includes('finance') || name.includes('accounting')) {
    return 'bg-gradient-to-r from-stone-600 to-stone-500 dark:from-stone-700 dark:to-stone-600';
  } else if (name.includes('people') || name.includes('hr')) {
    return 'bg-gradient-to-r from-neutral-600 to-neutral-500 dark:from-neutral-700 dark:to-neutral-600';
  } else if (name.includes('legal') || name.includes('compliance')) {
    return 'bg-gradient-to-r from-slate-700 to-slate-600 dark:from-slate-800 dark:to-slate-700';
  }

  // Default fallback: primary orange gradient
  return 'bg-gradient-to-r from-[#ff6a00] to-[#ed8133] dark:from-[#ff7a00] dark:to-[#ed8133]';
};
