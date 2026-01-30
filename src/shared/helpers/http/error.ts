interface IErrorFormatter {
    defaultMessage: string;
    message?: string;
};

const errorFormatter = (data: IErrorFormatter) => {
    return {
        defaultMessage: data.defaultMessage,
        message: data?.message || data.defaultMessage,
    };
};

export default errorFormatter;