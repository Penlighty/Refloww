"use client";

import { Button } from '@/components/ui';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';

interface ExportButtonsProps {
    onExportExcel: () => void;
    onExportCSV: () => void;
}

export default function ExportButtons({ onExportExcel, onExportCSV }: ExportButtonsProps) {
    return (
        <div className="flex items-center gap-2">
            <Button
                variant="secondary"
                size="sm"
                leftIcon={<FileSpreadsheet className="w-4 h-4" />}
                onClick={onExportExcel}
            >
                Excel
            </Button>
            <Button
                variant="outline"
                size="sm"
                leftIcon={<FileText className="w-4 h-4" />}
                onClick={onExportCSV}
            >
                CSV
            </Button>
        </div>
    );
}
