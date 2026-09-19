//jub bhi hum API se Succesfully responce lene ka code like ge to use is class me se guzaare ge
class ApiResponse {

    constructor(statusCode, data, message = "Success") {
        this.statusCode = statusCode
        this.data = data
        this.message = message
        this.success = statusCode < 400
    }
}

export { ApiResponse }