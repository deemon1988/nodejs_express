const {forEach} = require('./foreach')

const mockCb = jest.fn(x => 42 + x)

test('forEach mock function', () => {
    forEach([1, 2], mockCb)

    expect(mockCb).toHaveBeenCalledTimes(2)
})